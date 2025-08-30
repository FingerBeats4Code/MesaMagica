using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MesaMagica.Api.Catalog;
using MesaMagica.Api.Multitenancy;
using Microsoft.Extensions.Logging;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.IdentityModel.Tokens.Jwt;
using Swashbuckle.AspNetCore.Annotations;

namespace MesaMagica.Api.Controllers;

public class SessionResponse
{
    public string SessionId { get; set; } = string.Empty;
    public string Jwt { get; set; } = string.Empty;
}

[Route("api/sessions")]
[ApiController]
public class SessionsController : ControllerBase
{
    private readonly CatalogDbContext _catalogDbContext;
    private readonly ILogger<SessionsController> _logger;

    public SessionsController(CatalogDbContext catalogDbContext, ILogger<SessionsController> logger)
    {
        _catalogDbContext = catalogDbContext;
        _logger = logger;
    }

    [HttpPost("start")]
    [SwaggerOperation(Summary = "Starts a session for a tenant", Description = "Requires X-Tenant-Slug and X-Tenant-Key headers and tableId query parameter.")]
    [SwaggerResponse(200, "Session started successfully", typeof(SessionResponse))]
    [SwaggerResponse(401, "Tenant not found, inactive, or invalid key")]
    [SwaggerResponse(403, "License is invalid or expired")]
    public async Task<IActionResult> StartSession([FromQuery] int tableId)
    {
        var tenantContext = HttpContext.Items["TenantContext"] as TenantContext;
        if (tenantContext == null)
        {
            _logger.LogWarning("Tenant context not found.");
            return Unauthorized("Tenant context not found.");
        }

        var tenant = await _catalogDbContext.Tenants
            .FirstOrDefaultAsync(t => t.Slug.ToLower() == tenantContext.Slug.ToLower() && t.TenantKey == tenantContext.TenantKey && t.IsActive);
        if (tenant == null)
        {
            _logger.LogWarning("Tenant not found or invalid key. Slug: {TenantSlug}, Key: {TenantKey}", tenantContext.Slug, tenantContext.TenantKey);
            return Unauthorized($"Tenant with slug '{tenantContext.Slug}' not found, inactive, or invalid key.");
        }

        if (tenant.LicenseExpiration == null || tenant.LicenseExpiration < DateTime.UtcNow)
        {
            _logger.LogWarning("Tenant license is invalid or expired. Slug: {TenantSlug}, LicenseKey: {LicenseKey}, LicenseExpiration: {LicenseExpiration}",
                tenant.Slug, tenant.LicenseKey, tenant.LicenseExpiration);
            return StatusCode(StatusCodes.Status403Forbidden, $"Tenant '{tenantContext.Slug}' has an invalid or expired license.");
        }

        // Session creation logic
        var sessionId = Guid.NewGuid().ToString();
        var claims = new[]
        {
            new Claim("sessionId", sessionId),
            new Claim("tenantSlug", tenantContext.Slug),
            new Claim("tableId", tableId.ToString())
        };
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes("+XZSsmqXdhRcDHumiZvggGVSSb6SkrMWlYN7ASk+jzDcY2lYkz2eqHuH7ANvJPLsrzDiWZNga1TZu6MMSmbL2w=="));
        var token = new JwtSecurityToken(
            issuer: "MesaMagicaApi",
            audience: "MesaMagicaClient",
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(240),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256)
        );

        _logger.LogDebug("Session started for tenant: {TenantSlug}, TableId: {TableId}, SessionId: {SessionId}", tenantContext.Slug, tableId, sessionId);
        return Ok(new SessionResponse
        {
            SessionId = sessionId,
            Jwt = new JwtSecurityTokenHandler().WriteToken(token)
        });
    }
}