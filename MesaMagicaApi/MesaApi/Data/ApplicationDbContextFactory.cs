using MesaApi.Multitenancy;
using MesaMagica.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using System;
using System.IO;

public class ApplicationDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
{
    public ApplicationDbContext CreateDbContext(string[] args)
    {
        // Load config
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json")
            .Build();

        // Fallback connection string (Tenant DB directly)
        var connectionString = configuration.GetConnectionString("TenantConnection");
        if (string.IsNullOrEmpty(connectionString))
            throw new InvalidOperationException("TenantConnection is missing in appsettings.json.");

        // Dummy tenant context with all required properties
        ITenantContext tenantContext = new TenantContext(
            tenantId: Guid.NewGuid(),
            slug: "design-time",
            connectionString: connectionString,
            tenantKey: "key-design-time-1234567890",
            licenseKey: "license-design-time-123",
            licenseExpiration: DateTime.UtcNow.AddYears(5) // arbitrary expiration
        );

        // Build DbContext options
        var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();
        optionsBuilder.UseNpgsql(connectionString)
                      .EnableSensitiveDataLogging()
                      .EnableDetailedErrors();

        // Return with dummy tenant
        return new ApplicationDbContext(optionsBuilder.Options, tenantContext);
    }
}
