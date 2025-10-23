namespace MesaApi.Models
{
    //------------------changes for dynamic Redis configuration----------------------
    public class RedisSettings
    {
        public string Provider { get; set; } = "Local"; // Local, Upstash, StackExchange
        public string ConnectionString { get; set; } = "localhost:6379";
        public string RestUrl { get; set; } = string.Empty;
        public string RestToken { get; set; } = string.Empty;
    }
    //------------------end changes----------------------
}