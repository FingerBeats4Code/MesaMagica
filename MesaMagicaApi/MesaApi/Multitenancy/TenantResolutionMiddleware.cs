using Microsoft.EntityFrameworkCore;
using MesaMagica.Api.Catalog;
using Microsoft.Extensions.Logging;

namespace MesaMagica.Api.Multitenancy;

public class TenantResolutionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<TenantResolutionMiddleware> _logger;

    public TenantResolutionMiddleware(RequestDelegate next, ILogger<TenantResolutionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, IServiceProvider serviceProvider, CatalogDbContext catalogDbContext)
    {
        var tenantSlug = context.Request.Headers["X-Tenant-Slug"].FirstOrDefault();
        var tenantKey = context.Request.Headers["X-Tenant-Key"].FirstOrDefault();
        var path = context.Request.Path.Value?.ToLower();

        if (string.IsNullOrEmpty(tenantSlug))
        {
            _logger.LogWarning("X-Tenant-Slug header is missing for path: {Path}", path);
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await context.Response.WriteAsync("X-Tenant-Slug header is required.");
            return;
        }

        if (string.IsNullOrEmpty(tenantKey))
        {
            _logger.LogWarning("X-Tenant-Key header is missing for slug: {TenantSlug}, path: {Path}", tenantSlug, path);
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsync("X-Tenant-Key header is required.");
            return;
        }

        _logger.LogDebug("Querying tenant with slug: {TenantSlug} for path: {Path}", tenantSlug, path);

        if (catalogDbContext.Tenants == null)
        {
            _logger.LogError("CatalogDbContext.Tenants is null. Check CatalogDbContext configuration.");
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await context.Response.WriteAsync("Internal server error: Tenants DbSet is not initialized.");
            return;
        }

        var tenants = await catalogDbContext.Tenants.ToListAsync();
        _logger.LogDebug("Available tenants: [{Tenants}]", string.Join(", ", tenants.Select(t => $"Slug: {t.Slug}, IsActive: {t.IsActive}")));

        var tenant = await catalogDbContext.Tenants
            .FirstOrDefaultAsync(t => t.Slug.ToLower() == tenantSlug.ToLower() && t.TenantKey == tenantKey && t.IsActive);
        if (tenant == null)
        {
            _logger.LogWarning("Tenant not found or invalid key. Slug: {TenantSlug}, Key: {TenantKey}, Path: {Path}, Available tenants: [{Tenants}]",
                tenantSlug, tenantKey, path, string.Join(", ", tenants.Select(t => $"Slug: {t.Slug}, IsActive: {t.IsActive}")));
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsync($"Tenant with slug '{tenantSlug}' not found, inactive, or invalid key.");
            return;
        }

        _logger.LogDebug("Found tenant: Slug={Slug}, IsActive={IsActive}, ConnectionString={ConnectionString}, TenantKey={TenantKey}, LicenseKey={LicenseKey}, LicenseExpiration={LicenseExpiration}",
            tenant.Slug, tenant.IsActive, tenant.ConnectionString, tenant.TenantKey, tenant.LicenseKey, tenant.LicenseExpiration);

        var tenantContext = new TenantContext(
            tenantId: tenant.TenantId,
            slug: tenant.Slug,
            connectionString: tenant.ConnectionString,
            tenantKey: tenant.TenantKey,
            licenseKey: tenant.LicenseKey,
            licenseExpiration: tenant.LicenseExpiration
        );
        context.Items["TenantContext"] = tenantContext;

        await _next(context);
    }
}

public static class TenantResolutionMiddlewareExtensions
{
    public static IApplicationBuilder UseTenantResolution(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<TenantResolutionMiddleware>();
    }
}