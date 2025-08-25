using MesaApi.Interface;
using MesaApi.Multitenancy;
using MesaApi.Services;
using MesaMagica.Api.Data;
using MesaMagica.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace MesaApi.Extensions
{
    public static class ServiceCollectionsExtensions
    {
        public static IServiceCollection AddMesaMagicaServices(this IServiceCollection services, IConfiguration configuration)
        {
            // DbContext (you can replace with Multi-Tenant logic later)
            services.AddDbContext<ApplicationDbContext>(options =>
                options.UseNpgsql(configuration.GetConnectionString("DefaultConnection")));

            // Core Services
            services.AddScoped<ISessionService, SessionService>();
            services.AddScoped< ITenantContext, TenantContext>();
            //services.AddScoped<IMenuService, MenuService>();

            // Utility / Infra Services
            services.AddSingleton<ILoggingService, LoggingService>();

            return services;
            // Register DbContext
            //services.AddDbContext<ApplicationDbContext>(options =>
            //    options.UseNpgsql(configuration.GetConnectionString("DefaultConnection")));

            // Register your services
            //services.AddScoped<ISessionService, SessionService>();
            //services.AddSingleton<ILoggingService, LoggingService>();

            // Add more services here in future
            // services.AddScoped<IOrderService, OrderService>();
            // services.AddScoped<IMenuService, MenuService>();
        }
    }
}
