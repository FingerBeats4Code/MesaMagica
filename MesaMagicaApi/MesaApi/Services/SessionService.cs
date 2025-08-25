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

namespace MesaMagica.Api.Services;

public class SessionService : ISessionService
{
    private readonly ApplicationDbContext _db;
    private readonly JwtSettings _jwt;
    private readonly ITenantContext _tenant;

    public SessionService(ApplicationDbContext db, IOptions<JwtSettings> jwt, ITenantContext tenant)
    {
        _db = db;
        _jwt = jwt.Value;
        _tenant = tenant;
    }

    public async Task<(TableSession session, string jwt)> StartSessionAsync(int tableId, CancellationToken ct = default)
    {
        if (!_tenant.HasTenant)
            throw new InvalidOperationException("Tenant not resolved.");

        var table = await _db.RestaurantTables.FirstOrDefaultAsync(t => t.TableId == tableId, ct)
                    ?? throw new InvalidOperationException("Table not found");

        if (table.IsOccupied)
            throw new InvalidOperationException("Table is currently occupied");

        var session = new TableSession
        {
            TableId = tableId,
            SessionToken = Guid.NewGuid(),
            IsActive = true,
            StartedAt = DateTime.UtcNow
        };

        table.IsOccupied = true;

        _db.TableSessions.Add(session);
        _db.RestaurantTables.Update(table);
        await _db.SaveChangesAsync(ct);

        var jwt = GenerateJwt(session.SessionId, table.TableId, _tenant.TenantId);
        return (session, jwt);
    }

    public Task<TableSession?> GetActiveAsync(int sessionId, CancellationToken ct = default)
        => _db.TableSessions.Include(s => s.Table)
            .FirstOrDefaultAsync(s => s.SessionId == sessionId && s.IsActive, ct);

    private string GenerateJwt(int sessionId, int tableId, Guid tenantId)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.Key));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim("tenantId", tenantId.ToString()),
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
}
