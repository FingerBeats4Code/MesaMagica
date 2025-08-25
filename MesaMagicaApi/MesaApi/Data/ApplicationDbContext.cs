// Data/ApplicationDbContext.cs
using MesaApi.Model;
using MesaApi.Multitenancy;
using MesaApi.Models;
using MesaMagica.Api.Multitenancy;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace MesaMagica.Api.Data;

public class ApplicationDbContext : DbContext
{
    private readonly ITenantContext _tenant;

    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options, ITenantContext tenant)
        : base(options)
    {
        _tenant = tenant;
    }

    public DbSet<RestaurantTable> RestaurantTables => Set<RestaurantTable>();
    public DbSet<TableSession> TableSessions => Set<TableSession>();

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        if (!optionsBuilder.IsConfigured)
        {
            if (!_tenant.HasTenant)
                throw new InvalidOperationException("Tenant not resolved. Provide subdomain or X-Tenant-Slug header.");

            // IMPORTANT: use the tenant's connection string
            optionsBuilder.UseNpgsql(_tenant.ConnectionString);
        }
    }

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<RestaurantTable>(e =>
        {
            e.HasKey(x => x.TableId);
            e.HasIndex(x => x.TableNumber).IsUnique();
        });

        b.Entity<TableSession>(e =>
        {
            e.HasKey(x => x.SessionId);
            e.HasOne(x => x.Table)
             .WithMany()
             .HasForeignKey(x => x.TableId)
             .OnDelete(DeleteBehavior.Restrict);
        });
    }
}

