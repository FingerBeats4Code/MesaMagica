namespace MesaApi.Interface
{

    public interface ILoggingService
    {
        void LogInfo(string message, params object[] args);
        void LogWarning(string message, params object[] args);
        void LogError(Exception ex, string message, params object[] args);
    }

}
