using MesaApi.Interface;
using MesaApi.Multitenancy;
using MesaApi.Services;
using MesaMagica.Api.Data;
using Microsoft.EntityFrameworkCore;

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

            return services;
        }
    }
}