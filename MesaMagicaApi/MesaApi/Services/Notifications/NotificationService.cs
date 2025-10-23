using MesaApi.Configuration;
using MesaApi.Hubs;
using MesaApi.Models.Notifications;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Options;

namespace MesaApi.Services.Notifications;

public class NotificationService : INotificationService
{
    // FIX: Remove INotificationHub from IHubContext - just use NotificationHub
    private readonly IHubContext<NotificationHub> _hubContext;
    private readonly ILogger<NotificationService> _logger;
    private readonly NotificationConfiguration _config;

    public NotificationService(
        IHubContext<NotificationHub> hubContext,
        ILogger<NotificationService> logger,
        IOptions<NotificationConfiguration> config)
    {
        _hubContext = hubContext;
        _logger = logger;
        _config = config.Value;
    }

    public async Task NotifyOrderStatusChanged(
        string tenantKey,
        Guid orderId,
        string status,
        object orderData)
    {
        try
        {
            var message = new NotificationMessage
            {
                Type = NotificationType.OrderStatusChanged,
                TenantKey = tenantKey,
                Data = new
                {
                    orderId,
                    status,
                    order = orderData,
                    timestamp = DateTime.UtcNow
                }
            };

            // Send to admin group
            await _hubContext.Clients
                .Group($"tenant:{tenantKey}:admins")
                .SendAsync("OrderStatusChanged", message);

            _logger.LogInformation(
                "Order status notification sent: OrderId={OrderId}, Status={Status}, TenantKey={TenantKey}",
                orderId, status, tenantKey);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send order status notification: OrderId={OrderId}", orderId);
        }
    }

    public async Task NotifyNewOrder(
        string tenantKey,
        Guid orderId,
        string tableNumber,
        object orderData)
    {
        try
        {
            var message = new NotificationMessage
            {
                Type = NotificationType.NewOrder,
                TenantKey = tenantKey,
                Data = new
                {
                    orderId,
                    tableNumber,
                    order = orderData,
                    timestamp = DateTime.UtcNow
                }
            };

            // Send to admin group
            await _hubContext.Clients
                .Group($"tenant:{tenantKey}:admins")
                .SendAsync("NewOrderReceived", message);

            _logger.LogInformation(
                "New order notification sent: OrderId={OrderId}, Table={TableNumber}, TenantKey={TenantKey}",
                orderId, tableNumber, tenantKey);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send new order notification: OrderId={OrderId}", orderId);
        }
    }

    public async Task NotifySessionExpired(
        string tenantKey,
        Guid sessionId,
        string tableNumber,
        string reason)
    {
        try
        {
            var message = new NotificationMessage
            {
                Type = NotificationType.SessionExpired,
                TenantKey = tenantKey,
                Data = new SessionNotification
                {
                    SessionId = sessionId,
                    TableNumber = tableNumber,
                    Reason = reason
                }
            };

            // Send to admin group
            await _hubContext.Clients
                .Group($"tenant:{tenantKey}:admins")
                .SendAsync("SessionExpired", message);

            _logger.LogInformation(
                "Session expired notification sent: SessionId={SessionId}, Table={TableNumber}, Reason={Reason}",
                sessionId, tableNumber, reason);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send session expired notification: SessionId={SessionId}", sessionId);
        }
    }

    public async Task NotifyTableStatusChanged(
        string tenantKey,
        Guid tableId,
        bool isOccupied)
    {
        try
        {
            var message = new NotificationMessage
            {
                Type = NotificationType.TableStatusChanged,
                TenantKey = tenantKey,
                Data = new
                {
                    tableId,
                    isOccupied,
                    timestamp = DateTime.UtcNow
                }
            };

            // Send to admin group
            await _hubContext.Clients
                .Group($"tenant:{tenantKey}:admins")
                .SendAsync("TableStatusChanged", message);

            _logger.LogDebug(
                "Table status notification sent: TableId={TableId}, IsOccupied={IsOccupied}",
                tableId, isOccupied);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send table status notification: TableId={TableId}", tableId);
        }
    }

    public async Task NotifyCustomerOrderUpdate(
        string tenantKey,
        Guid sessionId,
        string status,
        object orderData)
    {
        try
        {
            var message = new NotificationMessage
            {
                Type = NotificationType.OrderStatusChanged,
                TenantKey = tenantKey,
                Data = new
                {
                    status,
                    order = orderData,
                    timestamp = DateTime.UtcNow
                }
            };

            // Send to customer's session group
            await _hubContext.Clients
                .Group($"session:{sessionId}")
                .SendAsync("OrderStatusChanged", message);

            _logger.LogInformation(
                "Customer order update sent: SessionId={SessionId}, Status={Status}",
                sessionId, status);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send customer order update: SessionId={SessionId}", sessionId);
        }
    }

    public async Task NotifyCustomerSessionExpiring(Guid sessionId, int minutesRemaining)
    {
        try
        {
            var message = new NotificationMessage
            {
                Type = NotificationType.SessionExpiring,
                Data = new
                {
                    sessionId,
                    minutesRemaining,
                    timestamp = DateTime.UtcNow
                }
            };

            // Send to customer's session group
            await _hubContext.Clients
                .Group($"session:{sessionId}")
                .SendAsync("SessionExpiring", message);

            _logger.LogInformation(
                "Session expiring notification sent: SessionId={SessionId}, MinutesRemaining={MinutesRemaining}",
                sessionId, minutesRemaining);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send session expiring notification: SessionId={SessionId}", sessionId);
        }
    }

    public async Task NotifyCustomerCartUpdated(Guid sessionId, object cartData)
    {
        try
        {
            var message = new NotificationMessage
            {
                Type = NotificationType.CartUpdated,
                Data = new
                {
                    cart = cartData,
                    timestamp = DateTime.UtcNow
                }
            };

            // Send to customer's session group
            await _hubContext.Clients
                .Group($"session:{sessionId}")
                .SendAsync("CartUpdated", message);

            _logger.LogDebug("Cart updated notification sent: SessionId={SessionId}", sessionId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send cart updated notification: SessionId={SessionId}", sessionId);
        }
    }

    public async Task BroadcastToTenant(string tenantKey, string eventType, object data)
    {
        try
        {
            var message = new NotificationMessage
            {
                TenantKey = tenantKey,
                Data = data
            };

            await _hubContext.Clients
                .Group($"tenant:{tenantKey}")
                .SendAsync(eventType, message);

            _logger.LogDebug("Broadcast sent to tenant: TenantKey={TenantKey}, EventType={EventType}",
                tenantKey, eventType);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to broadcast to tenant: TenantKey={TenantKey}", tenantKey);
        }
    }

    public async Task BroadcastToAdmins(string tenantKey, string eventType, object data)
    {
        try
        {
            var message = new NotificationMessage
            {
                TenantKey = tenantKey,
                Data = data
            };

            await _hubContext.Clients
                .Group($"tenant:{tenantKey}:admins")
                .SendAsync(eventType, message);

            _logger.LogDebug("Broadcast sent to admins: TenantKey={TenantKey}, EventType={EventType}",
                tenantKey, eventType);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to broadcast to admins: TenantKey={TenantKey}", tenantKey);
        }
    }

    public async Task<int> GetActiveConnectionsCount(string tenantKey)
    {
        // Placeholder - actual implementation would need connection tracking
        await Task.CompletedTask;
        return 0;
    }
}