using MesaApi.Multitenancy;
using MesaMagica.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace MesaMagica.Api.Data
{
    public class ApplicationDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
    {
        public ApplicationDbContext CreateDbContext(string[] args)
        {
            // Load configuration
            var configuration = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json")
                .Build();

            // Fallback connection string
            var connectionString = configuration.GetConnectionString("TenantConnection");
            if (string.IsNullOrEmpty(connectionString))
                throw new InvalidOperationException("DefaultTenantConnection is missing in appsettings.json.");

            // Create dummy tenant for design-time
            ITenantContext tenantContext = new TenantContext(
                tenantId: Guid.NewGuid(),
                slug: "design-time",
                connectionString: connectionString
            );

            // Build DbContext options
            var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();
            optionsBuilder.UseNpgsql(connectionString)
                          .EnableSensitiveDataLogging()
                          .EnableDetailedErrors();

            // Pass dummy tenant context to constructor
            return new ApplicationDbContext(optionsBuilder.Options, tenantContext);
        }
    }
}

