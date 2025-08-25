// Multitenancy/TenantResolutionMiddleware.cs
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using MesaMagica.Api.Catalog;

namespace MesaMagica.Api.Multitenancy;

public class TenantResolutionMiddleware
{
    private readonly RequestDelegate _next;

    public TenantResolutionMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext ctx, CatalogDbContext catalog, TenantContext tenant)
    {
        // 1) Try subdomain: <slug>.mesamagica.com
        var host = ctx.Request.Host.Host; // e.g., pizzapalace.mesamagica.com
        string? slug = null;

        var parts = host.Split('.', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length >= 3) // e.g., slug.domain.tld
        {
            slug = parts[0];
        }

        // 2) Fallback to header (useful for localhost)
        if (string.IsNullOrWhiteSpace(slug) && ctx.Request.Headers.TryGetValue("X-Tenant-Slug", out var h))
            slug = h.ToString();

        if (!string.IsNullOrWhiteSpace(slug))
        {
            var t = await catalog.Tenants.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Slug == slug && x.IsActive, ctx.RequestAborted);

            if (t is not null)
            {
                tenant.TenantId = t.TenantId;
                tenant.Slug = t.Slug;
                tenant.ConnectionString = t.ConnectionString;
                ctx.Items["TenantId"] = t.TenantId;
            }
        }

        await _next(ctx);
    }
}

public static class TenantResolutionExtensions
{
    public static IApplicationBuilder UseTenantResolution(this IApplicationBuilder app)
        => app.UseMiddleware<TenantResolutionMiddleware>();
}

