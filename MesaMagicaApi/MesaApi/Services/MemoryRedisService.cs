using System;
using System.Collections.Concurrent;
using System.Threading.Tasks;

public class MemoryRedisService : IRedisService
{
    private readonly ConcurrentDictionary<string, (string Value, DateTime? Expiry)> _cache = new();

    public Task<string> GetAsync(string key)
    {
        if (_cache.TryGetValue(key, out var entry))
        {
            if (entry.Expiry.HasValue && entry.Expiry.Value < DateTime.UtcNow)
            {
                _cache.TryRemove(key, out _);
                return Task.FromResult(string.Empty);
            }
            return Task.FromResult(entry.Value);
        }
        return Task.FromResult(string.Empty);
    }

    public Task SetAsync(string key, string value, TimeSpan? expiry = null)
    {
        var expiryTime = expiry.HasValue ? DateTime.UtcNow.Add(expiry.Value) : (DateTime?)null;
        _cache[key] = (value, expiryTime);
        return Task.CompletedTask;
    }

    public Task RemoveAsync(string key)
    {
        _cache.TryRemove(key, out _);
        return Task.CompletedTask;
    }

    //------------------changes for provider identification----------------------
    public string GetProviderName() => "InMemory";
    //------------------end changes----------------------
}