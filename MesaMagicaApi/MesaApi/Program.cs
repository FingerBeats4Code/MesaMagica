using MesaApi.Multitenancy;
using MesaApi.Services;
using MesaMagica.Api.Catalog;
using MesaMagica.Api.Extensions;
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

// Add services to the container.
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "MesaMagica API", Version = "v1" });
    c.EnableAnnotations();
    c.AddSecurityDefinition("TenantSlug", new OpenApiSecurityScheme
    {
        Name = "X-Tenant-Slug",
        Type = SecuritySchemeType.ApiKey,
        In = ParameterLocation.Header,
        Description = "Tenant slug to identify the tenant (e.g., pizzapalace)"
    });
    c.AddSecurityDefinition("TenantKey", new OpenApiSecurityScheme
    {
        Name = "X-Tenant-Key",
        Type = SecuritySchemeType.ApiKey,
        In = ParameterLocation.Header,
        Description = "Tenant key for authentication (e.g., key-pizzapalace-1234567890)"
    });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter 'Bearer {token}' obtained from POST /api/sessions/start"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "TenantSlug" } },
            new string[] { }
        },
        {
            new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "TenantKey" } },
            new string[] { }
        },
        {
            new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } },
            new string[] { }
        }
    });
});
builder.Services.AddControllers();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policyBuilder =>
    {
        policyBuilder.WithOrigins("http://localhost:3000")
                     .AllowAnyHeader()
                     .AllowAnyMethod();
    });
});

// Configure JWT settings
builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("Jwt"));

// Register IHttpContextAccessor
builder.Services.AddHttpContextAccessor();

// Register CatalogDbContext (global catalog)
builder.Services.AddDbContext<CatalogDbContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("CatalogConnection"))
       .EnableSensitiveDataLogging()
       .EnableDetailedErrors());

// Register ITenantContext with factory
builder.Services.AddScoped<ITenantContext>(sp =>
{
    var httpContextAccessor = sp.GetRequiredService<IHttpContextAccessor>();
    var httpContext = httpContextAccessor.HttpContext;

    // If middleware has resolved tenant
    if (httpContext?.Items["TenantContext"] is TenantContext tenantContext && tenantContext.HasTenant)
    {
        return tenantContext;
    }

    // Fallback tenant for non-HTTP contexts (e.g., migrations)
    var fallbackConnectionString = builder.Configuration.GetConnectionString("DefaultConnection");
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

// Register application services
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

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseRouting();
app.UseCors("AllowReactApp");
app.UseTenantResolution();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();