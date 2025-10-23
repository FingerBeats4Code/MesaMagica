using MesaApi.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace MesaApi.Hubs;

[Authorize]
public class NotificationHub : BaseHub
{
    public NotificationHub(ILogger<NotificationHub> logger) : base(logger)
    {
    }

    public override async Task OnConnectedAsync()
    {
        await base.OnConnectedAsync();

        var tenantKey = GetTenantKey();
        var connectionId = Context.ConnectionId;

        // Join tenant group
        await Groups.AddToGroupAsync(connectionId, $"tenant:{tenantKey}");

        // Join role-specific group
        if (IsAdmin() || IsStaff())
        {
            await Groups.AddToGroupAsync(connectionId, $"tenant:{tenantKey}:admins");
            Logger.LogInformation("Admin/Staff joined: ConnectionId={ConnectionId}", connectionId);
        }
        else
        {
            // Customer - join session group
            try
            {
                var sessionId = GetSessionId();
                await Groups.AddToGroupAsync(connectionId, $"session:{sessionId}");
                Logger.LogInformation("Customer joined session: ConnectionId={ConnectionId}, SessionId={SessionId}",
                    connectionId, sessionId);
            }
            catch (HubException)
            {
                Logger.LogWarning("Customer connection without valid session: ConnectionId={ConnectionId}", connectionId);
            }
        }
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var connectionId = Context.ConnectionId;

        try
        {
            var tenantKey = GetTenantKey();

            // Remove from tenant group
            await Groups.RemoveFromGroupAsync(connectionId, $"tenant:{tenantKey}");

            // Remove from role-specific groups
            if (IsAdmin() || IsStaff())
            {
                await Groups.RemoveFromGroupAsync(connectionId, $"tenant:{tenantKey}:admins");
            }
            else
            {
                try
                {
                    var sessionId = GetSessionId();
                    await Groups.RemoveFromGroupAsync(connectionId, $"session:{sessionId}");
                }
                catch { /* Session may not exist */ }
            }
        }
        catch (Exception ex)
        {
            Logger.LogError(ex, "Error removing from groups: ConnectionId={ConnectionId}", connectionId);
        }

        await base.OnDisconnectedAsync(exception);
    }

    // Client-callable methods
    [Authorize(Roles = "Admin,Staff")]
    public async Task JoinOrderChannel(Guid orderId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"order:{orderId}");
        Logger.LogDebug("Joined order channel: OrderId={OrderId}", orderId);
    }

    [Authorize(Roles = "Admin,Staff")]
    public async Task LeaveOrderChannel(Guid orderId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"order:{orderId}");
        Logger.LogDebug("Left order channel: OrderId={OrderId}", orderId);
    }

    public async Task JoinTableChannel(string tableNumber)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"table:{tableNumber}");
        Logger.LogDebug("Joined table channel: TableNumber={TableNumber}", tableNumber);
    }

    public async Task LeaveTableChannel(string tableNumber)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"table:{tableNumber}");
        Logger.LogDebug("Left table channel: TableNumber={TableNumber}", tableNumber);
    }

    // Ping method for connection testing
    public Task<string> Ping()
    {
        return Task.FromResult("pong");
    }
}