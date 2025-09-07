using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MesaMagica.Api.Catalog;
using MesaMagica.Api.Multitenancy;
using Microsoft.Extensions.Logging;
using Swashbuckle.AspNetCore.Annotations;

namespace MesaMagica.Api.Controllers;

public class LicenseValidationResponse
{
    public string Slug { get; set; } = string.Empty;
    public string LicenseKey { get; set; } = string.Empty;
    public DateTime? LicenseExpiration { get; set; }
}

[Route("api/tenants/license")]
[ApiController]
public class TenantLicenseController : ControllerBase
{
    private readonly CatalogDbContext _catalogDbContext;
    private readonly ILogger<TenantLicenseController> _logger;

    public TenantLicenseController(CatalogDbContext catalogDbContext, ILogger<TenantLicenseController> logger)
    {
        _catalogDbContext = catalogDbContext;
        _logger = logger;
    }

    [HttpPost("validate")]
    [SwaggerOperation(Summary = "Validates a tenant's license", Description = "Requires X-Tenant-Slug and X-Tenant-Key headers.")]
    [SwaggerResponse(200, "License is valid", typeof(LicenseValidationResponse))]
    [SwaggerResponse(401, "Tenant not found, inactive, or invalid key")]
    [SwaggerResponse(403, "License is invalid or expired")]
    public async Task<IActionResult> ValidateLicense()
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

        _logger.LogDebug("License validated for tenant: Slug={Slug}, LicenseKey={LicenseKey}, LicenseExpiration={LicenseExpiration}",
            tenant.Slug, tenant.LicenseKey, tenant.LicenseExpiration);
        return Ok(new LicenseValidationResponse
        {
            Slug = tenant.Slug,
            LicenseKey = tenant.LicenseKey,
            LicenseExpiration = tenant.LicenseExpiration
        });
    }
}