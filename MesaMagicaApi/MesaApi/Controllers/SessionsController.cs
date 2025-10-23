using MesaApi.Models;
using MesaApi.Multitenancy;
using MesaApi.Services; //----------------------------- changes: use SessionService -----------------------------
using MesaMagica.Api.Catalog;
using MesaMagica.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Swashbuckle.AspNetCore.Annotations;

namespace MesaMagica.Api.Controllers;

public class SessionResponse
{
    public string SessionId { get; set; } = string.Empty;
    public string Jwt { get; set; } = string.Empty;
}

public class StartSessionRequest
{
    public string TableId { get; set; } = string.Empty; // Now accepts Guid as string
    public string QRCodeUrl { get; set; } = string.Empty;
}

[Route("api/[controller]")]
[ApiController]
public class SessionsController : ControllerBase
{
    private readonly CatalogDbContext _catalogDbContext;
    private readonly ApplicationDbContext _applicationDbContext;
    private readonly ILogger<SessionsController> _logger;
    private readonly ISessionService _sessionService;

    public SessionsController(
        CatalogDbContext catalogDbContext,
        ApplicationDbContext applicationDbContext,
        ILogger<SessionsController> logger,
        ISessionService sessionService)
    {
        _catalogDbContext = catalogDbContext;
        _applicationDbContext = applicationDbContext;
        _logger = logger;
        _sessionService = sessionService;
    }

    [HttpPost("start")]
    [SwaggerOperation(Summary = "Starts a session for a tenant using QR code", Description = "Requires X-Tenant-Slug and X-Tenant-Key headers and QRCodeUrl in the request body.")]
    [SwaggerResponse(200, "Session started successfully", typeof(SessionResponse))]
    [SwaggerResponse(400, "Invalid QR code format")]
    [SwaggerResponse(401, "Tenant not found, inactive, or invalid key")]
    [SwaggerResponse(403, "License is invalid or expired")]
    [SwaggerResponse(404, "Table not found or inactive")]
    public async Task<IActionResult> StartSession([FromBody] StartSessionRequest request, CancellationToken ct)
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

            var tableIdStr = query["tableId"] ?? request.TableId;

            if (string.IsNullOrEmpty(tableIdStr))
            {
                _logger.LogWarning("Invalid QR code format. URL: {QRCodeUrl}", request.QRCodeUrl);
                return BadRequest("Invalid QR code format. Must contain tableId.");
            }

            if (!Guid.TryParse(tableIdStr, out var tableId)) // CHANGED: Parse as Guid
            {
                _logger.LogWarning("Invalid tableId in QR code. URL: {QRCodeUrl}", request.QRCodeUrl);
                return BadRequest("Invalid tableId in QR code.");
            }

            var (session, jwt) = await _sessionService.StartSessionAsync(tableId, ct);

            return Ok(new SessionResponse
            {
                SessionId = session.SessionId.ToString(),
                Jwt = jwt
            });
        }
        catch (UriFormatException)
        {
            _logger.LogWarning("Invalid QR code URL format. URL: {QRCodeUrl}", request.QRCodeUrl);
            return BadRequest("Invalid QR code URL format.");
        }
    }

    // MesaMagicaApi/MesaApi/Controllers/SessionsController.cs
    // Add this method to the SessionsController class

    [HttpPost("close")]
    [SwaggerOperation(Summary = "Closes a session and frees the table")]
    [SwaggerResponse(200, "Session closed successfully")]
    [SwaggerResponse(400, "Invalid request")]
    [SwaggerResponse(404, "Session not found")]
    public async Task<IActionResult> CloseSession([FromBody] CloseSessionRequest request, CancellationToken ct)
    {
        if (request.SessionId == Guid.Empty)
        {
            _logger.LogWarning("Invalid session ID in close request");
            return BadRequest("Invalid session ID");
        }

        try
        {
            await _sessionService.CloseSessionAsync(request.SessionId, ct);
            return Ok(new { message = "Session closed successfully" });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Session not found: {SessionId}", request.SessionId);
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error closing session: {SessionId}", request.SessionId);
            return StatusCode(500, "Error closing session");
        }
    }

    // Add this class at the bottom of the file
    public class CloseSessionRequest
    {
        public Guid SessionId { get; set; }
    }
}

