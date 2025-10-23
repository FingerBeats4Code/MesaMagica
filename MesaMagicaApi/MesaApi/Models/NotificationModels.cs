namespace MesaApi.Models.Notifications;

public enum NotificationType
{
    OrderStatusChanged,
    NewOrder,
    SessionExpired,
    TableStatusChanged,
    CartUpdated,
    SessionExpiring,
    OrderDelivered
}

public class NotificationMessage
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public NotificationType Type { get; set; }
    public string TenantKey { get; set; } = string.Empty;
    public object Data { get; set; } = new();
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public class OrderNotification
{
    public Guid OrderId { get; set; }
    public string Status { get; set; } = string.Empty;
    public string TableNumber { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public int ItemCount { get; set; }
}

public class SessionNotification
{
    public Guid SessionId { get; set; }
    public string TableNumber { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public int MinutesRemaining { get; set; }
}