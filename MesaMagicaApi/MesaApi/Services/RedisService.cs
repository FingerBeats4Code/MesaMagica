using MesaApi.Models;
using StackExchange.Redis;
using System.Net.Http;
using System.Runtime;

public class RedisService : IRedisService
{
    private readonly IDatabase _db;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly HttpClient _httpClient;
    private readonly UpstashSettings _settings;
    public RedisService(IConnectionMultiplexer multiplexer, IHttpClientFactory httpClientFactory, UpstashSettings settings)
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
        var request = new HttpRequestMessage(HttpMethod.Get, $"{_settings.UPSTASH_REDIS_REST_URL}/del/{key}");
        request.Headers.Add("Authorization", $"Bearer {_settings.UPSTASH_REDIS_REST_TOKEN}");
        await _httpClient.SendAsync(request);
    }

}