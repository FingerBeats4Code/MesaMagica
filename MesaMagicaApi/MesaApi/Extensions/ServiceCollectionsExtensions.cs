using MesaApi.Interface;
using MesaApi.Models;
using MesaApi.Multitenancy;
using MesaApi.Services;
using MesaMagica.Api.Data;
using MesaMagicaApi.Services;
using Microsoft.AspNetCore.Cors.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using StackExchange.Redis;

namespace MesaMagica.Api.Extensions
{
    public static class ServiceCollectionsExtensions
    {
        public static IServiceCollection AddMesaMagicaServices(this IServiceCollection services, IConfiguration configuration)
        {
            // Register ApplicationDbContext with tenant-based connection string
            services.AddDbContext<ApplicationDbContext>((serviceProvider, options) =>
            {
                var tenantContext = serviceProvider.GetRequiredService<ITenantContext>();
                if (!tenantContext.HasTenant)
                {
                    throw new InvalidOperationException("Tenant context not resolved.");
                }
                options.UseNpgsql(tenantContext.ConnectionString)
                       .EnableSensitiveDataLogging()
                       .EnableDetailedErrors();
            });
            services.AddScoped<ISessionService, SessionService>();
            services.AddSingleton<ILoggingService, LoggingService>();
            services.AddScoped<IOrderService, OrderService>();
            services.AddScoped<IMenuService, MenuService>();
            services.AddScoped<ICategoryService, CategoryService>();
            services.AddScoped<IUsersService, UsersService>();
            services.AddScoped<IAuthService, AuthService>();
            // Add CartService (see below)
            services.AddScoped<ICartService, CartService>();
            services.AddHttpClient(); // IHttpClientFactory
            services.Configure<UpstashSettings>(configuration.GetSection("Upstash"));
            services.AddSingleton(sp => sp.GetRequiredService<IOptions<UpstashSettings>>().Value);
            services.AddSingleton<IConnectionMultiplexer>(sp =>
            {
                var config = configuration.GetSection("Upstash").GetValue<string>("Configuration");
                return ConnectionMultiplexer.Connect(config!);
            });
            if (Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development")
            {
                services.AddSingleton<IRedisService, MemoryRedisService>();
            }
            else
            {
                services.AddScoped<IRedisService, RedisService>();
            }

            return services;
        }
    }
}