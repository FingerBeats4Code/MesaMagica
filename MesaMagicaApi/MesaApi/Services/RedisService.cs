using MesaApi.Models;
using StackExchange.Redis;
using System.Net.Http;

//------------------changes for dynamic Redis configuration and URL encoding----------------------
public class RedisService : IRedisService
{
    private readonly IDatabase _db;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly HttpClient _httpClient;
    private readonly RedisSettings _settings;

    public RedisService(
        IConnectionMultiplexer multiplexer,
        IHttpClientFactory httpClientFactory,
        RedisSettings settings)
    {
        _db = multiplexer.GetDatabase();
        _httpClientFactory = httpClientFactory;
        _httpClient = _httpClientFactory.CreateClient();
        _settings = settings;
    }

    public async Task<string> GetAsync(string key)
    {
        var value = await _db.StringGetAsync(key);
        return value.HasValue ? value.ToString()! : string.Empty;
    }

    public async Task SetAsync(string key, string value, TimeSpan? expiry = null) =>
        await _db.StringSetAsync(key, value, expiry);

    public async Task RemoveAsync(string key)
    {
        // Use REST API for Upstash provider
        if (_settings.Provider.Equals("Upstash", StringComparison.OrdinalIgnoreCase)
            && !string.IsNullOrEmpty(_settings.RestUrl))
        {
            var encodedKey = Uri.EscapeDataString(key); // Fix URL encoding
            var request = new HttpRequestMessage(HttpMethod.Get,
                $"{_settings.RestUrl}/del/{encodedKey}");
            request.Headers.Add("Authorization", $"Bearer {_settings.RestToken}");
            await _httpClient.SendAsync(request);
        }
        else
        {
            // Use standard Redis command for local or StackExchange
            await _db.KeyDeleteAsync(key);
        }
    }

    public string GetProviderName() => _settings.Provider;
}
//------------------end changes----------------------