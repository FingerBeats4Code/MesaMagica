using MesaApi.Common;
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
    private readonly ILogger<SessionService> _logger;

    public SessionService(
        ApplicationDbContext db,
        IOptions<JwtSettings> jwt,
        IHttpContextAccessor httpContextAccessor,
        ILogger<SessionService> logger)
    {
        _db = db;
        _jwt = jwt.Value;
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
    }

    public async Task<(TableSession session, string jwt)> StartSessionAsync(Guid tableId, CancellationToken ct = default)
    {
        var tenantContext = _httpContextAccessor.HttpContext?.Items["TenantContext"] as ITenantContext
            ?? throw new InvalidOperationException("Tenant context not resolved.");

        if (!tenantContext.HasTenant)
            throw new InvalidOperationException("Tenant not resolved.");

        var table = await _db.RestaurantTables.FirstOrDefaultAsync(t => t.TableId == tableId, ct)
                    ?? throw new InvalidOperationException("Table not found");

        var seatSize = table.TableSeatSize > 0 ? table.TableSeatSize : 1;

        // Try to find and increment existing active session with concurrency control
        var activeSession = await _db.TableSessions
            .FirstOrDefaultAsync(s => s.TableId == tableId && s.IsActive, ct);

        if (activeSession != null)
        {
            // Use raw SQL to atomically increment with row-level locking
            var rowsAffected = await _db.Database.ExecuteSqlRawAsync(
                @"UPDATE ""TableSessions"" 
                  SET ""SessionCount"" = ""SessionCount"" + 1 
                  WHERE ""SessionId"" = {0} 
                    AND ""SessionCount"" < {1} 
                    AND ""IsActive"" = true",
                new object[] { activeSession.SessionId, seatSize },
                ct);

            if (rowsAffected == 0)
            {
                _logger.LogWarning("Table {TableId} is fully occupied. Current count: {Count}, Max: {Max}",
                    tableId, activeSession.SessionCount, seatSize);
                throw new InvalidOperationException("Table is fully occupied.");
            }

            // Refresh the entity to get updated SessionCount
            await _db.Entry(activeSession).ReloadAsync(ct);

            _logger.LogInformation("Incremented session count for table {TableId}. New count: {Count}",
                tableId, activeSession.SessionCount);

            var existingJwt = GenerateJwt(activeSession.SessionId, table.TableId, tenantContext.TenantKey);
            return (activeSession, existingJwt);
        }

        // Create new session if none active
        var newSession = new TableSession
        {
            TableId = tableId,
            SessionToken = Guid.NewGuid(),
            IsActive = true,
            StartedAt = DateTime.UtcNow,
            SessionCount = 1
        };

        table.IsOccupied = true;
        _db.TableSessions.Add(newSession);
        _db.RestaurantTables.Update(table);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Created new session for table {TableId}", tableId);

        var jwt = GenerateJwt(newSession.SessionId, table.TableId, tenantContext.TenantKey);
        return (newSession, jwt);
    }

    public Task<TableSession?> GetActiveAsync(Guid sessionId, CancellationToken ct = default)
        => _db.TableSessions.Include(s => s.Table)
            .FirstOrDefaultAsync(s => s.SessionId == sessionId && s.IsActive, ct);

    private string GenerateJwt(Guid sessionId, Guid tableId, string tenantKey)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.Key));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtClaims.TenantKey, tenantKey),
            new Claim(JwtClaims.SessionId, sessionId.ToString()),
            new Claim(JwtClaims.TableId, tableId.ToString()), // Now Guid
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
}