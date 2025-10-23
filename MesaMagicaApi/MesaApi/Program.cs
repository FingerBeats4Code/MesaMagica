using MesaApi.Hubs;
using MesaApi.Models;
using MesaApi.Multitenancy;
using MesaApi.Services;
using MesaMagica.Api.Catalog;
using MesaMagica.Api.Extensions;
using MesaMagica.Api.Middleware;
using MesaMagica.Api.Multitenancy;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;

System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.SetMinimumLevel(LogLevel.Debug);

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

// CORS Configuration
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
var allowedDomains = builder.Configuration.GetSection("Cors:AllowedDomains").Get<string[]>() ?? Array.Empty<string>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowConfiguredOrigins", policy =>
    {
        policy.SetIsOriginAllowed(origin =>
        {
            try
            {
                var uri = new Uri(origin);
                if (allowedOrigins.Contains(origin))
                    return true;
                foreach (var domain in allowedDomains)
                {
                    if (uri.Host.EndsWith(domain, StringComparison.OrdinalIgnoreCase) ||
                        uri.Host.Equals(domain, StringComparison.OrdinalIgnoreCase))
                        return true;
                }
                if (builder.Environment.IsDevelopment() && uri.Host == "localhost")
                    return true;
                return false;
            }
            catch
            {
                return false;
            }
        })
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials();
    });
});

// JWT Configuration
builder.Services.Configure<JwtSettings>(options =>
{
    var jwtSection = builder.Configuration.GetSection("Jwt");
    options.Key = jwtSection["Key"]!;
    options.Issuer = jwtSection["Issuer"]!;
    options.Audience = jwtSection["Audience"]!;
    options.ExpiryMinutes = 60;
});

// Session Timeout Configuration
builder.Services.Configure<SessionTimeoutSettings>(
    builder.Configuration.GetSection("SessionTimeout"));

builder.Services.AddHttpContextAccessor();

// Catalog DbContext
builder.Services.AddDbContext<CatalogDbContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("CatalogConnection"))
       .EnableSensitiveDataLogging(builder.Environment.IsDevelopment())
       .EnableDetailedErrors(builder.Environment.IsDevelopment()));

// Tenant Context
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

// MesaMagica Services
builder.Services.AddMesaMagicaServices(builder.Configuration);

// Background Services
builder.Services.AddHostedService<SessionTimeoutService>();

// ===== SIGNALR INTEGRATION =====
builder.Services.AddSignalRWithRedis(builder.Configuration, builder.Environment);
// ===== END SIGNALR =====

// JWT Authentication
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
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ClockSkew = TimeSpan.Zero
    };

    // ===== SIGNALR JWT AUTHENTICATION =====
    o.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
    // ===== END SIGNALR JWT =====
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowConfiguredOrigins");
app.UseHttpsRedirection();
app.UseRouting();

app.UseGlobalExceptionHandler();
app.UseTenantResolution();
app.UseAuthentication();
app.UseAuthorization();

// ===== MAP SIGNALR HUBS =====
app.MapHub<NotificationHub>("/hubs/notifications");
// ===== END SIGNALR HUBS =====

app.MapControllers();

app.Run();