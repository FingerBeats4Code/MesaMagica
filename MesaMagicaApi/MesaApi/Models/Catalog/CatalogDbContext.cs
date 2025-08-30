using MesaApi.Model.Catalog;
using Microsoft.EntityFrameworkCore;

namespace MesaMagica.Api.Catalog;

public class CatalogDbContext : DbContext
{
    public CatalogDbContext(DbContextOptions<CatalogDbContext> options) : base(options)
    {
    }

    public DbSet<Tenant> Tenants { get; set; } = null!; // Ensure this is present and not null

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Tenant>(entity =>
        {
            entity.HasKey(t => t.TenantId);
            entity.Property(t => t.Name).IsRequired();
            entity.Property(t => t.Slug).IsRequired();
            entity.Property(t => t.ConnectionString).IsRequired();
            entity.Property(t => t.TenantKey).IsRequired();
            entity.Property(t => t.LicenseKey).IsRequired();
            entity.Property(t => t.LicenseExpiration);
            entity.Property(t => t.IsActive).IsRequired();
            entity.Property(t => t.CreatedAt).IsRequired();
        });
    }
}