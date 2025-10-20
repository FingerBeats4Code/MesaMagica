// MesaMagicaApi/MesaApi/Extensions/ServiceCollectionsExtensions.cs
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
            //------------------changes for conditional sensitive data logging----------------------
            services.AddDbContext<ApplicationDbContext>((serviceProvider, options) =>
            {
                var tenantContext = serviceProvider.GetRequiredService<ITenantContext>();
                if (!tenantContext.HasTenant)
                {
                    throw new InvalidOperationException("Tenant context not resolved.");
                }

                var env = serviceProvider.GetService<IHostEnvironment>();
                options.UseNpgsql(tenantContext.ConnectionString);

                if (env != null && env.IsDevelopment())
                {
                    options.EnableSensitiveDataLogging()
                           .EnableDetailedErrors();
                }
            });
            //------------------end changes----------------------

            // Register all services
            services.AddScoped<ISessionService, SessionService>();
            services.AddSingleton<ILoggingService, LoggingService>();
            services.AddScoped<IOrderService, OrderService>();
            services.AddScoped<IMenuService, MenuService>();
            services.AddScoped<ICategoryService, CategoryService>();
            services.AddScoped<IUsersService, UsersService>();
            services.AddScoped<IAuthService, AuthService>();
            services.AddScoped<ICartService, CartService>();

            // ADD THESE MISSING SERVICES
            services.AddScoped<IAdminService, AdminService>();
            services.AddScoped<ITableService, TableService>();

            services.AddHttpClient();

            //------------------changes for dynamic Redis configuration----------------------
            services.Configure<RedisSettings>(configuration.GetSection("Redis"));
            services.AddSingleton(sp => sp.GetRequiredService<IOptions<RedisSettings>>().Value);

            // Configure Redis based on provider
            var redisSettings = configuration.GetSection("Redis").Get<RedisSettings>();

            if (Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development")
            {
                services.AddSingleton<IRedisService, MemoryRedisService>();
            }
            else if (redisSettings?.Provider == "StackExchange" || redisSettings?.Provider == "Local")
            {
                services.AddSingleton<IConnectionMultiplexer>(sp =>
                {
                    var settings = sp.GetRequiredService<RedisSettings>();
                    return ConnectionMultiplexer.Connect(settings.ConnectionString);
                });
                services.AddScoped<IRedisService, RedisService>();
            }
            else if (redisSettings?.Provider == "Upstash")
            {
                services.AddSingleton<IConnectionMultiplexer>(sp =>
                {
                    var settings = sp.GetRequiredService<RedisSettings>();
                    return ConnectionMultiplexer.Connect(settings.ConnectionString);
                });
                services.AddScoped<IRedisService, RedisService>();
            }
            else
            {
                // Fallback to in-memory
                services.AddSingleton<IRedisService, MemoryRedisService>();
            }
            //------------------end changes----------------------

            return services;
        }
    }
}