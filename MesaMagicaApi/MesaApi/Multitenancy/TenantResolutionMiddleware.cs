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
        // Get IHostEnvironment from DI
        var env = serviceProvider.GetService<IHostEnvironment>();
        // ----------------- changes: resolve tenant from domain instead of header -----------------
        var host = context.Request.Host.Host; // e.g., mesa.tenantA.com
        var parts = host.Split('.');
        string tenantSlugFromDomain = null;

        if (parts.Length >= 3 && parts[0].Equals("mesa", StringComparison.OrdinalIgnoreCase))
        {
            tenantSlugFromDomain = parts[1]; // tenantname from domain
        }

        // ----------------- changes: optional X-Slug header can still be read -----------------
        var slugHeader = context.Request.Headers["X-Slug"].FirstOrDefault();
        // ----------------- DEVELOPMENT FALLBACK -----------------
        if (string.IsNullOrEmpty(tenantSlugFromDomain) && env != null && HostEnvironmentEnvExtensions.IsDevelopment(env))
        {
            tenantSlugFromDomain = "pizzapalace"; // replace with your local default tenant slug
            _logger.LogWarning("Using development default tenant slug: {TenantSlug}", tenantSlugFromDomain);
        }
        if (string.IsNullOrEmpty(tenantSlugFromDomain))
        {
            _logger.LogWarning("Tenant could not be resolved from domain: {Host}", host);
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await context.Response.WriteAsync("Tenant could not be resolved from subdomain.");
            return;
        }

        _logger.LogDebug("Querying tenant from slug: {TenantSlug} (domain) for path: {Path}", tenantSlugFromDomain, context.Request.Path);

        if (catalogDbContext.Tenants == null)
        {
            _logger.LogError("CatalogDbContext.Tenants is null. Check CatalogDbContext configuration.");
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await context.Response.WriteAsync("Internal server error: Tenants DbSet is not initialized.");
            return;
        }

        // ----------------- changes: remove tenantKey header validation -----------------
        var tenant = await catalogDbContext.Tenants
            .FirstOrDefaultAsync(t => t.Slug.ToLower() == tenantSlugFromDomain.ToLower() && t.IsActive);

        if (tenant == null)
        {
            _logger.LogWarning("Tenant not found or inactive. Slug: {TenantSlug}, Path: {Path}", tenantSlugFromDomain, context.Request.Path);
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsync($"Tenant '{tenantSlugFromDomain}' not found or inactive.");
            return;
        }

        _logger.LogDebug("Found tenant: Slug={Slug}, IsActive={IsActive}, ConnectionString={ConnectionString}, LicenseKey={LicenseKey}, LicenseExpiration={LicenseExpiration}",
            tenant.Slug, tenant.IsActive, tenant.ConnectionString, tenant.LicenseKey, tenant.LicenseExpiration);

        // ----------------- changes: build TenantContext as before, using resolved tenant -----------------
        var tenantContext = new TenantContext(
            tenantId: tenant.TenantId,
            slug: tenant.Slug,
            connectionString: tenant.ConnectionString,
            tenantKey: tenant.TenantKey, // optional for JWT if needed
            licenseKey: tenant.LicenseKey,
            licenseExpiration: tenant.LicenseExpiration
        );

        // ----------------- changes: attach TenantContext to HttpContext -----------------
        context.Items["TenantContext"] = tenantContext;

        await _next(context);
    }
}

// ----------------- changes: extension method remains unchanged -----------------
public static class TenantResolutionMiddlewareExtensions
{
    public static IApplicationBuilder UseTenantResolution(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<TenantResolutionMiddleware>();
    }
}
