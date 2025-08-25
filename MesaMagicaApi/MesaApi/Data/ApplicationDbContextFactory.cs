using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using System.IO;
using MesaMagica.Api.Catalog;
using MesaMagica.Api.Data;
using MesaMagica.Api.Multitenancy;

namespace MesaMagica.Api.Data;

public class ApplicationDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
{


    public ApplicationDbContext CreateDbContext(string[] args)
    {
        var basePath = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", ".."));
        var config = new ConfigurationBuilder()
            .SetBasePath(basePath)
            .AddJsonFile("appsettings.json", optional: false, reloadOnChange: false)
            .Build();

        var catalogConnectionString = config.GetConnectionString("CatalogConnection");
        if (string.IsNullOrEmpty(catalogConnectionString))
        {
            throw new InvalidOperationException("CatalogConnection string not found in appsettings.json");
        }

        var catalogOptionsBuilder = new DbContextOptionsBuilder<CatalogDbContext>();
        catalogOptionsBuilder.UseNpgsql(catalogConnectionString);

        var tenantSlug = "pizzapalace";
        string tenantConnectionString;
        using (var catalogDb = new CatalogDbContext(catalogOptionsBuilder.Options))
        {
            try
            {
                var tenant = catalogDb.Tenants
                    .FirstOrDefault(t => t.Slug == tenantSlug && t.IsActive);
                if (tenant == null)
                {
                    var availableTenants = catalogDb.Tenants.ToList();
                    var tenantList = string.Join(", ", availableTenants.Select(t => $"Slug: {t.Slug}, IsActive: {t.IsActive}"));
                    throw new InvalidOperationException($"Tenant with slug '{tenantSlug}' not found. Available tenants: [{tenantList}]");
                }
                tenantConnectionString = tenant.ConnectionString;
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException($"Failed to query Tenants table: {ex.Message}", ex);
            }
        }

        var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();
        optionsBuilder.UseNpgsql(tenantConnectionString);

        var tenantContext = new TenantContext
        {
            TenantId = Guid.NewGuid(),
            Slug = tenantSlug,
            ConnectionString = tenantConnectionString
        };

        return new ApplicationDbContext(optionsBuilder.Options, tenantContext);
    }
}