//------------------changes for dynamic Redis service----------------------
public interface IRedisService
{
    Task<string> GetAsync(string key);
    Task SetAsync(string key, string value, TimeSpan? expiry = null);
    Task RemoveAsync(string key);
    string GetProviderName(); // New method to identify provider
}
//------------------end changes----------------------