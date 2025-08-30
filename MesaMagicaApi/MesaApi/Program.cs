using MesaApi.Multitenancy;
using MesaApi.Services;
using MesaMagica.Api.Catalog;
using MesaMagica.Api.Data;
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
        Description = "Tenant slug to identify the tenant"
    });
    c.AddSecurityDefinition("TenantKey", new OpenApiSecurityScheme
    {
        Name = "X-Tenant-Key",
        Type = SecuritySchemeType.ApiKey,
        In = ParameterLocation.Header,
        Description = "Tenant key for authentication"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "TenantSlug"
                }
            },
            new string[] { }
        },
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "TenantKey"
                }
            },
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

// Register ApplicationDbContext with dynamic tenant-based connection string
builder.Services.AddDbContext<ApplicationDbContext>((serviceProvider, options) =>
{
    var httpContextAccessor = serviceProvider.GetRequiredService<IHttpContextAccessor>();
    var tenantContext = httpContextAccessor.HttpContext?.Items["TenantContext"] as ITenantContext;

    if (tenantContext == null || !tenantContext.HasTenant)
    {
        throw new InvalidOperationException("Tenant context not resolved.");
    }

    options.UseNpgsql(tenantContext.ConnectionString)
           .EnableSensitiveDataLogging()
           .EnableDetailedErrors();
});

// Register ITenantContext with factory
builder.Services.AddScoped<ITenantContext>(sp =>
{
    var httpContextAccessor = sp.GetRequiredService<IHttpContextAccessor>();
    var httpContext = httpContextAccessor.HttpContext;

    // If middleware has already resolved tenant
    if (httpContext?.Items["TenantContext"] is ITenantContext tenantContext && tenantContext.HasTenant)
    {
        return tenantContext;
    }

    // Fallback tenant (e.g., for migrations, background tasks)
    return new TenantContext(
        tenantId: Guid.NewGuid(),
        slug: "fallback-tenant",
        connectionString: builder.Configuration.GetConnectionString("TenantConnection"),
        tenantKey: "key-fallback-123",
        licenseKey: "license-fallback-123",
        licenseExpiration: DateTime.UtcNow.AddYears(2)
    );
});

// Register application services
builder.Services.AddScoped<ISessionService, SessionService>();

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
app.UseTenantResolution(); // custom middleware
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
