using MesaApi.Models;
using MesaApi.Multitenancy;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace MesaMagica.Api.Data
{
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
        public DbSet<MenuItem> MenuItems => Set<MenuItem>();
        public DbSet<Order> Orders => Set<Order>();
        public DbSet<OrderItem> OrderItems => Set<OrderItem>();
        public DbSet<User> Users => Set<User>();
        public DbSet<Category> Categories => Set<Category>();

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            if (!optionsBuilder.IsConfigured)
            {
                if (!_tenant.HasTenant)
                    throw new InvalidOperationException("Tenant not resolved. Provide subdomain or X-Tenant-Slug header.");

                optionsBuilder.UseNpgsql(_tenant.ConnectionString)
                              .EnableSensitiveDataLogging()
                              .EnableDetailedErrors();
            }
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<RestaurantTable>(e =>
            {
                e.HasKey(x => x.TableId);
                e.HasIndex(x => x.TableNumber).IsUnique();
            });

            modelBuilder.Entity<TableSession>(e =>
            {
                e.HasKey(x => x.SessionId);
                e.HasOne(x => x.Table)
                 .WithMany()
                 .HasForeignKey(x => x.TableId)
                 .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<Category>(e =>
            {
                e.HasKey(c => c.CategoryId);
                e.HasIndex(c => c.Name).IsUnique();
            });

            modelBuilder.Entity<MenuItem>(e =>
            {
                e.HasKey(m => m.ItemId);
                e.HasOne(m => m.Category)
                 .WithMany()
                 .HasForeignKey(m => m.CategoryId)
                 .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<Order>(e =>
            {
                e.HasKey(o => o.OrderId);
                e.HasOne(o => o.Session)
                 .WithMany()
                 .HasForeignKey(o => o.SessionId)
                 .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<OrderItem>(e =>
            {
                e.HasKey(oi => oi.OrderItemId);
                e.HasOne(oi => oi.Order)
                 .WithMany(o => o.OrderItems)
                 .HasForeignKey(oi => oi.OrderId)
                 .OnDelete(DeleteBehavior.Cascade);
                e.HasOne(oi => oi.MenuItem)
                 .WithMany()
                 .HasForeignKey(oi => oi.ItemId)
                 .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<User>(e =>
            {
                e.HasKey(u => u.UserId);
                e.HasIndex(u => u.Username).IsUnique();
                e.Property(u => u.Role).HasMaxLength(50); // Matches Role column
                e.Property(u => u.Email).HasMaxLength(100);
                e.Property(u => u.CreatedAt).HasColumnType("timestamp with time zone");
            });
        }
    }
}