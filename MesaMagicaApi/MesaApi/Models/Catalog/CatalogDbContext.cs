// Catalog/CatalogDbContext.cs
using MesaApi.Model.Catalog;
using Microsoft.EntityFrameworkCore;

namespace MesaMagica.Api.Catalog;
public class CatalogDbContext : DbContext
{
    public CatalogDbContext(DbContextOptions<CatalogDbContext> options) : base(options) { }
    public DbSet<CatalogTenant> Tenants => Set<CatalogTenant>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<CatalogTenant>(e =>
        {
            e.HasKey(x => x.TenantId);
            e.HasIndex(x => x.Slug).IsUnique();
        });
    }
}
