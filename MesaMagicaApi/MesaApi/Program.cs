using MesaApi.Multitenancy;
using MesaApi.Services;
using MesaMagica.Api.Catalog;
using MesaMagica.Api.Data;
using MesaMagica.Api.Multitenancy;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;
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
    c.AddSecurityDefinition("Tenant", new OpenApiSecurityScheme
    {
        Description = "Tenant slug header",
        Name = "X-Tenant-Slug",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Tenant" }
            },
            new List<string>()
        }
    });
});
builder.Services.AddControllers();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", builder =>
    {
        builder.WithOrigins("http://localhost:3000")
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
    opt.UseNpgsql(builder.Configuration.GetConnectionString("CatalogConnection")).EnableSensitiveDataLogging()
   .EnableDetailedErrors());
//opt.UseNpgsql(builder.Configuration.GetConnectionString("CatalogConnection"))
// Register ApplicationDbContext with dynamic connection string
builder.Services.AddDbContext<ApplicationDbContext>((serviceProvider, options) =>
{
    var httpContextAccessor = serviceProvider.GetRequiredService<IHttpContextAccessor>();
    var tenantContext = httpContextAccessor.HttpContext?.Items["TenantContext"] as ITenantContext;
    if (tenantContext == null || !tenantContext.HasTenant)
    {
        throw new InvalidOperationException("Tenant context not resolved.");
    }
    options.UseNpgsql(tenantContext.ConnectionString);
});

// Register services
builder.Services.AddScoped<ITenantContext, TenantContext>();
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
app.UseTenantResolution();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();