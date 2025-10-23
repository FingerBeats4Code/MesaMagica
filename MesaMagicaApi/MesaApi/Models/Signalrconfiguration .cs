namespace MesaApi.Configuration;

public class SignalRConfiguration
{
    public bool EnableDetailedErrors { get; set; } = false;
    public int KeepAliveInterval { get; set; } = 15;
    public int ClientTimeoutInterval { get; set; } = 30;
    public int HandshakeTimeout { get; set; } = 15;
    public int MaxBufferSize { get; set; } = 32768;
    public bool EnableMessagePackProtocol { get; set; } = true;
}

public class NotificationConfiguration
{
    public bool EnableBackgroundProcessing { get; set; } = true;
    public int BatchSize { get; set; } = 100;
    public int FlushInterval { get; set; } = 5;
    public int RetryAttempts { get; set; } = 3;
    public int RetryDelay { get; set; } = 1000;
}