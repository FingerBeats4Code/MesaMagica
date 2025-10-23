// MesaMagicaApi/MesaApi/Services/SessionTimeoutService.cs
// COMPLETE FIXED VERSION with SignalR integration

using MesaApi.Common;
using MesaApi.Models;
using MesaApi.Services.Notifications;
using MesaMagica.Api.Catalog;
using MesaMagica.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace MesaApi.Services
{
    public class SessionTimeoutService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<SessionTimeoutService> _logger;
        private readonly SessionTimeoutSettings _settings;

        public SessionTimeoutService(
            IServiceProvider serviceProvider,
            ILogger<SessionTimeoutService> logger,
            IOptions<SessionTimeoutSettings> settings)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
            _settings = settings.Value;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            if (!_settings.EnableAutoCleanup)
            {
                _logger.LogInformation("Session timeout cleanup is disabled");
                return;
            }

            _logger.LogInformation(
                "Session timeout service started. Cleanup interval: {Interval} minutes, " +
                "Inactive timeout: {InactiveTimeout} mins, Served order timeout: {ServedTimeout} mins",
                _settings.CleanupIntervalMinutes,
                _settings.InactiveSessionTimeout,
                _settings.ServedOrderTimeout);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await CleanupExpiredSessionsAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error during session cleanup");
                }

                await Task.Delay(
                    TimeSpan.FromMinutes(_settings.CleanupIntervalMinutes),
                    stoppingToken);
            }
        }

        private async Task CleanupExpiredSessionsAsync(CancellationToken cancellationToken)
        {
            using var scope = _serviceProvider.CreateScope();
            var catalogDb = scope.ServiceProvider.GetRequiredService<CatalogDbContext>();

            var tenants = await catalogDb.Tenants
                .Where(t => t.IsActive)
                .ToListAsync(cancellationToken);

            _logger.LogDebug("Checking {Count} tenants for expired sessions", tenants.Count);

            foreach (var tenant in tenants)
            {
                try
                {
                    await CleanupTenantSessionsAsync(tenant, cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex,
                        "Error cleaning up sessions for tenant {TenantSlug}",
                        tenant.Slug);
                }
            }
        }

        private async Task CleanupTenantSessionsAsync(
            MesaApi.Model.Catalog.Tenant tenant,
            CancellationToken cancellationToken)
        {
            var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();
            optionsBuilder.UseNpgsql(tenant.ConnectionString);

            var tenantContext = new TenantContext(
                tenant.TenantId,
                tenant.Slug,
                tenant.ConnectionString,
                tenant.TenantKey,
                tenant.LicenseKey,
                tenant.LicenseExpiration);

            using var scope = _serviceProvider.CreateScope();

            // FIX: Get notification service from scope
            var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();

            await using var db = new ApplicationDbContext(optionsBuilder.Options, tenantContext);

            var now = DateTime.UtcNow;
            var inactiveThreshold = now.AddMinutes(-_settings.InactiveSessionTimeout);
            var servedThreshold = now.AddMinutes(-_settings.ServedOrderTimeout);

            var expiredSessions = await db.TableSessions
                .Include(s => s.Table)
                .Where(s => s.IsActive &&
                    (
                        (!db.Orders.Any(o => o.SessionId == s.SessionId) &&
                         s.StartedAt < inactiveThreshold)
                        ||
                        (db.Orders.Any(o => o.SessionId == s.SessionId &&
                                          o.Status == OrderStatus.Served) &&
                         !db.Orders.Any(o => o.SessionId == s.SessionId &&
                                          o.Status == OrderStatus.Closed) &&
                         s.StartedAt < servedThreshold)
                    ))
                .ToListAsync(cancellationToken);

            if (!expiredSessions.Any())
            {
                _logger.LogDebug("No expired sessions for tenant {TenantSlug}", tenant.Slug);
                return;
            }

            _logger.LogInformation(
                "Found {Count} expired sessions for tenant {TenantSlug}",
                expiredSessions.Count,
                tenant.Slug);

            foreach (var session in expiredSessions)
            {
                try
                {
                    // FIX: Check if session has orders before determining reason
                    var hasOrders = await db.Orders
                        .AnyAsync(o => o.SessionId == session.SessionId, cancellationToken);

                    // Close the session
                    session.IsActive = false;
                    session.EndedAt = DateTime.UtcNow;
                    session.SessionCount = 0;

                    // Check if no more active sessions for this table
                    var hasActiveSessions = await db.TableSessions
                        .AnyAsync(s => s.TableId == session.TableId &&
                                      s.IsActive &&
                                      s.SessionId != session.SessionId,
                                 cancellationToken);

                    if (!hasActiveSessions && session.Table != null)
                    {
                        session.Table.IsOccupied = false;
                    }

                    // Clear cart items
                    var cartItems = await db.CartItems
                        .Where(c => c.SessionId == session.SessionId)
                        .ToListAsync(cancellationToken);

                    if (cartItems.Any())
                    {
                        db.CartItems.RemoveRange(cartItems);
                    }

                    await db.SaveChangesAsync(cancellationToken);

                    _logger.LogInformation(
                        "Expired session closed: SessionId={SessionId}, TableId={TableId}, " +
                        "TableNumber={TableNumber}, StartedAt={StartedAt}, TenantSlug={TenantSlug}",
                        session.SessionId,
                        session.TableId,
                        session.Table?.TableNumber ?? "Unknown",
                        session.StartedAt,
                        tenant.Slug);

                    // FIX: Send SignalR notification with correct reason
                    var reason = hasOrders ? "ServedOrderTimeout" : "InactiveSessionTimeout";

                    await notificationService.NotifySessionExpired(
                        tenant.TenantKey,
                        session.SessionId,
                        session.Table?.TableNumber ?? "Unknown",
                        reason);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex,
                        "Error closing expired session {SessionId} for tenant {TenantSlug}",
                        session.SessionId,
                        tenant.Slug);
                }
            }
        }
    }
}