using MesaApi.Models;
using MesaApi.Multitenancy;
using MesaMagica.Api.Catalog;
using MesaMagica.Api.Data;
using MesaMagica.Api.Multitenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using Swashbuckle.AspNetCore.Annotations;
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace MesaMagica.Api.Controllers;

public class SessionResponse
{
    public string SessionId { get; set; } = string.Empty;
    public string Jwt { get; set; } = string.Empty;
}

public class StartSessionRequest
{
    public string TableId { get; set; } = string.Empty; 
    public string QRCodeUrl { get; set; } = string.Empty;
}

[Route("api/[controller]")]
[ApiController]
public class SessionsController : ControllerBase
{
    private readonly CatalogDbContext _catalogDbContext;
    private readonly ApplicationDbContext _applicationDbContext;
    private readonly ILogger<SessionsController> _logger;

    public SessionsController(CatalogDbContext catalogDbContext, ApplicationDbContext applicationDbContext, ILogger<SessionsController> logger)
    {
        _catalogDbContext = catalogDbContext;
        _applicationDbContext = applicationDbContext;
        _logger = logger;
    }

    [HttpPost("start")]
    [SwaggerOperation(Summary = "Starts a session for a tenant using QR code", Description = "Requires X-Tenant-Slug and X-Tenant-Key headers and QRCodeUrl in the request body.")]
    [SwaggerResponse(200, "Session started successfully", typeof(SessionResponse))]
    [SwaggerResponse(400, "Invalid QR code format")]
    [SwaggerResponse(401, "Tenant not found, inactive, or invalid key")]
    [SwaggerResponse(403, "License is invalid or expired")]
    [SwaggerResponse(404, "Table not found or inactive")]
    public async Task<IActionResult> StartSession([FromBody] StartSessionRequest request)
    {
        if (string.IsNullOrEmpty(request.QRCodeUrl))
        {
            _logger.LogWarning("QR code URL is empty.");
            return BadRequest("QR code URL is required.");
        }

        try
        {
            var uri = new Uri(request.QRCodeUrl);
            var query = System.Web.HttpUtility.ParseQueryString(uri.Query);
            //var tableIdStr = query["tableId"];

            if (string.IsNullOrEmpty(request.TableId))
            {
                _logger.LogWarning("Invalid QR code format. URL: {QRCodeUrl}", request.QRCodeUrl);
                return BadRequest("Invalid QR code format. Must contain tableId.");
            }

            if (!int.TryParse(request.TableId, out var tableId))
            {
                _logger.LogWarning("Invalid tableId in QR code. URL: {QRCodeUrl}", request.QRCodeUrl);
                return BadRequest("Invalid tableId in QR code.");
            }

            // 🔹 Get tenantSlug and apiKey from headers
            var tenantSlug = HttpContext.Request.Headers["X-Tenant-Slug"].FirstOrDefault();
            var tenantKey = HttpContext.Request.Headers["X-Tenant-Key"].FirstOrDefault();

            if (string.IsNullOrEmpty(tenantSlug) || string.IsNullOrEmpty(tenantKey))
            {
                _logger.LogWarning("Tenant slug or key not provided in headers.");
                return Unauthorized("Tenant slug and key are required in headers.");
            }

            // 🔹 Validate tenant
            var tenant = await _catalogDbContext.Tenants
                .FirstOrDefaultAsync(t =>
                    t.Slug.ToLower() == tenantSlug.ToLower() &&
                    t.TenantKey == tenantKey &&
                    t.IsActive);

            if (tenant == null)
            {
                _logger.LogWarning("Tenant not found or invalid key. Slug: {TenantSlug}, Key: {TenantKey}", tenantSlug, tenantKey);
                return Unauthorized($"Tenant with slug '{tenantSlug}' not found, inactive, or invalid key.");
            }

            if (tenant.LicenseExpiration == null || tenant.LicenseExpiration < DateTime.UtcNow)
            {
                _logger.LogWarning("Tenant license is invalid or expired. Slug: {TenantSlug}", tenant.Slug);
                return StatusCode(StatusCodes.Status403Forbidden, $"Tenant '{tenantSlug}' has an invalid or expired license.");
            }

            // 🔹 Validate table
            var table = await _applicationDbContext.RestaurantTables.FirstOrDefaultAsync(t => t.TableId == tableId);
            if (table == null)
            {
                _logger.LogWarning("Table not found. TableId: {TableId}", tableId);
                return NotFound($"Table with ID {tableId} not found.");
            }

            // 🔹 Check for existing session
            var existingSession = await _applicationDbContext.TableSessions.FirstOrDefaultAsync(s => s.TableId == tableId && s.IsActive);
            var sessionId = existingSession?.SessionId ?? Guid.NewGuid();

            if (existingSession == null)
            {
                var session = new TableSession
                {
                    SessionId = sessionId,
                    TableId = tableId,
                    IsActive = true,
                    StartedAt = DateTime.UtcNow,
                };
                _applicationDbContext.TableSessions.Add(session);
                await _applicationDbContext.SaveChangesAsync();
            }

        
            var claims = new[]
            {
                new Claim("sessionId", sessionId.ToString()),
                new Claim("tenantSlug", tenant.Slug),
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
            return Ok(new SessionResponse
            {
                SessionId = sessionId.ToString(),
                Jwt = new JwtSecurityTokenHandler().WriteToken(token)
            });
        }
        catch (UriFormatException)
        {
            _logger.LogWarning("Invalid QR code URL format. URL: {QRCodeUrl}", request.QRCodeUrl);
            return BadRequest("Invalid QR code URL format.");
        }
    }

}