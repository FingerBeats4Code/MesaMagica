using MesaApi.Multitenancy;
using MesaApi.Services;
using MesaMagica.Api.Catalog;
using MesaMagica.Api.Extensions;
using MesaMagica.Api.Middleware; // ADD THIS
using MesaMagica.Api.Multitenancy;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;

var builder = WebApplication.CreateBuilder(args);
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.SetMinimumLevel(LogLevel.Debug);

// Add services to the container
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "MesaMagica API", Version = "v1" });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter 'Bearer {token}'"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } },
            Array.Empty<string>()
        }
    });
});

builder.WebHost.UseUrls("http://*:80");
builder.Services.AddControllers();

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowConfiguredOrigins", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Configure JWT settings
builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("Jwt"));

// Register IHttpContextAccessor
builder.Services.AddHttpContextAccessor();

// Register CatalogDbContext
builder.Services.AddDbContext<CatalogDbContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("CatalogConnection"))
       .EnableSensitiveDataLogging()
       .EnableDetailedErrors());

// Register ITenantContext
builder.Services.AddScoped<ITenantContext>(sp =>
{
    var httpContextAccessor = sp.GetRequiredService<IHttpContextAccessor>();
    var httpContext = httpContextAccessor.HttpContext;

    if (httpContext?.Items["TenantContext"] is TenantContext tenantContext && tenantContext.HasTenant)
    {
        return tenantContext;
    }

    var fallbackConnectionString = builder.Configuration.GetConnectionString("TenantConnection");
    if (string.IsNullOrWhiteSpace(fallbackConnectionString))
    {
        throw new InvalidOperationException("Fallback tenant connection string is not configured.");
    }

    return new TenantContext(
        tenantId: Guid.NewGuid(),
        slug: "fallback-tenant",
        connectionString: fallbackConnectionString,
        tenantKey: "key-fallback-123",
        licenseKey: "license-fallback-123",
        licenseExpiration: DateTime.UtcNow.AddYears(2)
    );
});

builder.Services.AddMesaMagicaServices(builder.Configuration);

// Configure JWT authentication
var jwt = builder.Configuration.GetSection("Jwt");
var key = Encoding.UTF8.GetBytes(jwt["Key"]!);

builder.Services.AddAuthentication(o =>
{
    o.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    o.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(o =>
{
    o.RequireHttpsMetadata = false;
    o.SaveToken = true;
    o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwt["Issuer"],
        ValidAudience = jwt["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(key)
    };
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowConfiguredOrigins");
app.UseHttpsRedirection();
app.UseRouting();

// ADD GLOBAL EXCEPTION HANDLER - MUST BE BEFORE AUTHENTICATION
app.UseGlobalExceptionHandler();

app.UseTenantResolution();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();