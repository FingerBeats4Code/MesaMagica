using MesaApi.Common;
using MesaApi.Multitenancy;
using MesaMagica.Api.Data;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace MesaApi.Services
{
    //------------------changes for removing duplicate validation code----------------------
    public abstract class TenantAwareService
    {
        protected readonly ApplicationDbContext _dbContext;
        protected readonly ITenantContext _tenantContext;
        protected readonly ILogger _logger;

        protected TenantAwareService(
            ApplicationDbContext dbContext,
            ITenantContext tenantContext,
            ILogger logger)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _tenantContext = tenantContext ?? throw new ArgumentNullException(nameof(tenantContext));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        protected async Task<Guid> ValidateAdminAndGetUserIdAsync(ClaimsPrincipal user, string tenantKey)
        {
            if (!user.IsInRole(Roles.Admin))
                throw new UnauthorizedAccessException("Admin role required.");

            //------------------changes for consistent tenant validation from JWT----------------------
            var userTenantKey = user.FindFirst(JwtClaims.TenantKey)?.Value;
            if (string.IsNullOrEmpty(userTenantKey) || userTenantKey != tenantKey)
                throw new UnauthorizedAccessException("Tenant mismatch in JWT token.");
            //------------------end changes----------------------

            var userIdClaim = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
                throw new UnauthorizedAccessException("Invalid user ID in token.");

            var dbUser = await _dbContext.Users
                .FirstOrDefaultAsync(u => u.UserId == userId && u.Role == Roles.Admin && u.IsActive);

            if (dbUser == null)
                throw new UnauthorizedAccessException("User is not an active admin in the database.");

            return userId;
        }

        protected string GetTenantKeyFromUser(ClaimsPrincipal user)
        {
            //------------------changes for consistent tenant key retrieval----------------------
            var tenantKey = user.FindFirst(JwtClaims.TenantKey)?.Value;
            if (string.IsNullOrEmpty(tenantKey))
                throw new UnauthorizedAccessException("Tenant key not found in JWT token.");
            return tenantKey;
            //------------------end changes----------------------
        }
    }
    //------------------end changes----------------------
}