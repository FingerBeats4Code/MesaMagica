// Controllers/SessionsController.cs
using MesaApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace MesaMagica.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SessionsController : ControllerBase
{
    private readonly ISessionService _sessions;

    public SessionsController(ISessionService sessions)
    {
        _sessions = sessions;
    }

    /// POST /api/sessions/start?tableId=12
    /// Requires tenant resolution (subdomain or X-Tenant-Slug header)
    [HttpPost("start")]
    public async Task<IActionResult> Start([FromQuery] int tableId, CancellationToken ct)
    {
        try
        {
            var (session, jwt) = await _sessions.StartSessionAsync(tableId, ct);
            return Ok(new { sessionId = session.SessionId, jwt });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}

