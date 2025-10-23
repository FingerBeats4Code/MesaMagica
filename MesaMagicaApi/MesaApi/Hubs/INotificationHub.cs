namespace MesaApi.Hubs;

public interface INotificationHub
{
    Task OrderStatusChanged(object notification);
    Task NewOrderReceived(object notification);
    Task SessionExpired(object notification);
    Task TableStatusChanged(object notification);
    Task CartUpdated(object notification);
    Task SessionExpiring(object notification);
}