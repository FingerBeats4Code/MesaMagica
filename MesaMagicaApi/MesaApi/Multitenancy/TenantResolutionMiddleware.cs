using MesaApi.Multitenancy;
using MesaMagica.Api.Catalog;
using Microsoft.EntityFrameworkCore;

namespace MesaMagica.Api.Multitenancy;

public class TenantResolutionMiddleware
{
    private readonly RequestDelegate _next;

    public TenantResolutionMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, IServiceProvider serviceProvider, CatalogDbContext catalogDbContext)
    {
        // Get tenant slug from header
        var tenantSlug = context.Request.Headers["X-Tenant-Slug"].FirstOrDefault();
        if (string.IsNullOrEmpty(tenantSlug))
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await context.Response.WriteAsync("X-Tenant-Slug header is required.");
            return;
        }

        // Query Tenants table
        var tenant = await catalogDbContext.Tenants
            .FirstOrDefaultAsync(t => t.Slug == tenantSlug && t.IsActive);
        if (tenant == null)
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            await context.Response.WriteAsync($"Tenant with slug '{tenantSlug}' not found or inactive.");
            return;
        }

        // Create new TenantContext and replace in service scope
        var scope = context.RequestServices.GetRequiredService<IServiceScopeFactory>().CreateScope();
        var tenantContext = new TenantContext(tenant.TenantId, tenant.Slug, tenant.ConnectionString);
        context.RequestServices = scope.ServiceProvider;
        var serviceScope = serviceProvider.CreateScope();
        serviceScope.ServiceProvider.GetRequiredService<ITenantContext>();
        context.Items["TenantContext"] = tenantContext; // Store in HttpContext for access

        // Continue pipeline
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