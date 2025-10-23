using MesaApi.Models;
using MesaApi.Multitenancy;
using MesaMagica.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace MesaApi.Services
{
    public class QRCodeService : IQRCodeService
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly ITenantContext _tenantContext;

        public QRCodeService(ApplicationDbContext dbContext, ITenantContext tenantContext)
        {
            _dbContext = dbContext;
            _tenantContext = tenantContext;
        }

        // Change: Parse tableIdStr as Guid instead of int, and use Guid in all comparisons
        public async Task<string> StartSessionAsync(string qrCodeUrl)
        {
            if (string.IsNullOrEmpty(qrCodeUrl))
                throw new ArgumentException("QR code URL is required.");

            // Parse QR code URL
            var uri = new Uri(qrCodeUrl);
            var query = System.Web.HttpUtility.ParseQueryString(uri.Query);
            var tenantSlug = query["tenantSlug"];
            var tableIdStr = query["tableId"];

            if (string.IsNullOrEmpty(tenantSlug) || string.IsNullOrEmpty(tableIdStr))
                throw new InvalidOperationException("Invalid QR code format. Must contain tenantSlug and tableId.");

            if (tenantSlug != _tenantContext.Slug)
                throw new UnauthorizedAccessException("QR code tenant does not match current tenant.");

            if (!Guid.TryParse(tableIdStr, out var tableId))
                throw new InvalidOperationException("Invalid tableId in QR code.");

            // Validate table exists and is active
            var table = await _dbContext.RestaurantTables
                .FirstOrDefaultAsync(t => t.TableId == tableId);

            if (table == null)
                throw new InvalidOperationException($"Table with ID {tableId} not found or inactive.");

            // Check for existing active session
            var existingSession = await _dbContext.TableSessions
                .FirstOrDefaultAsync(s => s.TableId == tableId && s.IsActive);

            if (existingSession != null)
                return existingSession.SessionId.ToString();

            // Create new session
            var session = new TableSession
            {
                SessionId = Guid.NewGuid(),
                TableId = tableId,
                IsActive = true,
                StartedAt = DateTime.UtcNow,
                EndedAt = DateTime.UtcNow
            };

            _dbContext.TableSessions.Add(session);
            await _dbContext.SaveChangesAsync();

            return session.SessionId.ToString();
        }
    }
}
