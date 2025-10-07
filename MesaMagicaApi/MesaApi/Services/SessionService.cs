// Services/SessionService.cs
using MesaApi.Models;
using MesaApi.Multitenancy;
using MesaApi.Services;
using MesaMagica.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace MesaApi.Services;

public class SessionService : ISessionService
{
    private readonly ApplicationDbContext _db;
    private readonly JwtSettings _jwt;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public SessionService(ApplicationDbContext db, IOptions<JwtSettings> jwt, IHttpContextAccessor httpContextAccessor)
    {
        _db = db;
        _jwt = jwt.Value;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task<(TableSession session, string jwt)> StartSessionAsync(int tableId, CancellationToken ct = default)
    {
        var tenantContext = _httpContextAccessor.HttpContext?.Items["TenantContext"] as ITenantContext
            ?? throw new InvalidOperationException("Tenant context not resolved.");

        if (!tenantContext.HasTenant)
            throw new InvalidOperationException("Tenant not resolved.");

        var table = await _db.RestaurantTables.FirstOrDefaultAsync(t => t.TableId == tableId, ct)
                    ?? throw new InvalidOperationException("Table not found");

        //-----------------------------------------changes for seat count-----------------------------------------
        var activeSession = await _db.TableSessions
            .FirstOrDefaultAsync(s => s.TableId == tableId && s.IsActive, ct);

        int seatSize = table.TableSeatSize > 0 ? table.TableSeatSize : 1;

        // If an active session exists, increment session count if within limit
        if (activeSession != null)
        {
            if (activeSession.SessionCount < seatSize)
            {
                activeSession.SessionCount += 1;
                _db.TableSessions.Update(activeSession);
                await _db.SaveChangesAsync(ct);

                var existingJwt = GenerateJwt(activeSession.SessionId, table.TableId, tenantContext.TenantId);
                return (activeSession, existingJwt);
            }
            else
            {
                throw new InvalidOperationException("Table is fully occupied.");
            }
        }
        //-----------------------------------------end changes for seat count-----------------------------------------

        // Create new session if none active
        var newSession = new TableSession
        {
            TableId = tableId,
            SessionToken = Guid.NewGuid(),
            IsActive = true,
            StartedAt = DateTime.UtcNow,
            SessionCount = 1 // first user/session
        };

        table.IsOccupied = true;
        _db.TableSessions.Add(newSession);
        _db.RestaurantTables.Update(table);
        await _db.SaveChangesAsync(ct);

        var jwt = GenerateJwt(newSession.SessionId, table.TableId, tenantContext.TenantId);
        return (newSession, jwt);
    }

    public Task<TableSession?> GetActiveAsync(Guid sessionId, CancellationToken ct = default)
        => _db.TableSessions.Include(s => s.Table)
            .FirstOrDefaultAsync(s => s.SessionId == sessionId && s.IsActive, ct);

    // Fix: Convert tenantKey (Guid) to string when creating Claim
    private string GenerateJwt(Guid sessionId, int tableId, Guid tenantKey)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.Key));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim("tenantKey", tenantKey.ToString()), // Convert Guid to string
            new Claim("sessionId", sessionId.ToString()),
            new Claim("tableId", tableId.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: _jwt.Issuer,
            audience: _jwt.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_jwt.ExpiryMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
    //----------------------------- end changes -----------------------------

    //public Task UpdateSessionStatusAsync(Guid sessionId, UpdateSessionStatusRequest request, ClaimsPrincipal user, string tenantSlug, string tenantKey, CancellationToken ct = default)
    //{
    //    throw new NotImplementedException();
    //}
}
