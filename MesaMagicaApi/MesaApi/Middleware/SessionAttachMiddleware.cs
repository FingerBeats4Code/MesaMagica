// Middleware/SessionAttachMiddleware.cs
using System.IdentityModel.Tokens.Jwt;
using MesaApi.Services;
using Microsoft.Extensions.Primitives;

namespace MesaMagica.Api.Middleware;

public class SessionAttachMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ISessionService _sessionService;

    public SessionAttachMiddleware(RequestDelegate next, ISessionService sessionService)
    {
        _next = next;
        _sessionService = sessionService;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (context.Request.Headers.TryGetValue("Authorization", out StringValues auth) &&
            auth.ToString().StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            var token = auth.ToString()["Bearer ".Length..].Trim();
            try
            {
                var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
                var sid = jwt.Claims.FirstOrDefault(c => c.Type == "sessionId")?.Value;

                if (Guid.TryParse(sid, out var sessionId))
                {
                    var session = await _sessionService.GetActiveAsync(sessionId, context.RequestAborted);
                    if (session is not null)
                        context.Items["Session"] = session;
                }
            }
            catch { /* ignore, JWT auth will handle invalid tokens */ }
        }

        await _next(context);
    }
}

public static class SessionAttachExtensions
{
    public static IApplicationBuilder UseSessionAttach(this IApplicationBuilder app)
        => app.UseMiddleware<SessionAttachMiddleware>();
}
