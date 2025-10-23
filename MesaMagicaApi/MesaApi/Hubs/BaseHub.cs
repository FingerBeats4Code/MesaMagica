using MesaApi.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace MesaApi.Hubs;

[Authorize]
public abstract class BaseHub : Hub
{
    protected ILogger Logger { get; }

    protected BaseHub(ILogger logger)
    {
        Logger = logger;
    }

    protected string GetTenantKey()
    {
        var tenantKey = Context.User?.FindFirst(JwtClaims.TenantKey)?.Value;
        if (string.IsNullOrEmpty(tenantKey))
            throw new HubException("Tenant key not found");
        return tenantKey;
    }

    protected string GetUserId()
    {
        var userId = Context.User?.FindFirst(JwtClaims.UserId)?.Value;
        if (string.IsNullOrEmpty(userId))
            throw new HubException("User ID not found");
        return userId;
    }

    protected Guid GetSessionId()
    {
        var sessionIdClaim = Context.User?.FindFirst(JwtClaims.SessionId)?.Value;
        if (!Guid.TryParse(sessionIdClaim, out var sessionId))
            throw new HubException("Invalid session ID");
        return sessionId;
    }

    protected bool IsAdmin()
    {
        return Context.User?.IsInRole(Roles.Admin) ?? false;
    }

    protected bool IsStaff()
    {
        return Context.User?.IsInRole(Roles.Staff) ?? false;
    }

    public override async Task OnConnectedAsync()
    {
        try
        {
            var tenantKey = GetTenantKey();
            var connectionId = Context.ConnectionId;

            Logger.LogInformation(
                "SignalR connection established: ConnectionId={ConnectionId}, TenantKey={TenantKey}",
                connectionId, tenantKey);

            await base.OnConnectedAsync();
        }
        catch (Exception ex)
        {
            Logger.LogError(ex, "Error in OnConnectedAsync");
            throw;
        }
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var connectionId = Context.ConnectionId;

        if (exception != null)
        {
            Logger.LogError(exception,
                "SignalR disconnected with error: ConnectionId={ConnectionId}",
                connectionId);
        }
        else
        {
            Logger.LogInformation(
                "SignalR disconnected: ConnectionId={ConnectionId}",
                connectionId);
        }

        await base.OnDisconnectedAsync(exception);
    }
}