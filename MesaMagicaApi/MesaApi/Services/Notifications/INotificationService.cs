namespace MesaApi.Services.Notifications;

public interface INotificationService
{
    // Admin Notifications
    Task NotifyOrderStatusChanged(string tenantKey, Guid orderId, string status, object orderData);
    Task NotifyNewOrder(string tenantKey, Guid orderId, string tableNumber, object orderData);
    Task NotifySessionExpired(string tenantKey, Guid sessionId, string tableNumber, string reason);
    Task NotifyTableStatusChanged(string tenantKey, Guid tableId, bool isOccupied);

    // Customer Notifications
    Task NotifyCustomerOrderUpdate(string tenantKey, Guid sessionId, string status, object orderData);
    Task NotifyCustomerSessionExpiring(Guid sessionId, int minutesRemaining);
    Task NotifyCustomerCartUpdated(Guid sessionId, object cartData);

    // Broadcast Notifications
    Task BroadcastToTenant(string tenantKey, string eventType, object data);
    Task BroadcastToAdmins(string tenantKey, string eventType, object data);

    // Connection Management
    Task<int> GetActiveConnectionsCount(string tenantKey);
}