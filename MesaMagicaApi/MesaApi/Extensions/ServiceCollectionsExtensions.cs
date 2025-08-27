using MesaApi.Interface;
using MesaApi.Multitenancy;
using MesaApi.Services;
using MesaMagica.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace MesaApi.Extensions
{
    public static class ServiceCollectionsExtensions
    {
        public static IServiceCollection AddMesaMagicaServices(this IServiceCollection services, IConfiguration configuration)
        {
            services.AddDbContext<ApplicationDbContext>(options =>
                options.UseNpgsql(configuration.GetConnectionString("DefaultConnection")));
            services.AddScoped<ISessionService, SessionService>();
            services.AddScoped< ITenantContext, TenantContext>();
            services.AddSingleton<ILoggingService, LoggingService>();

            return services;
        }
    }
}
