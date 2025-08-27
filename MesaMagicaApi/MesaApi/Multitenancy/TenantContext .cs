using MesaApi.Multitenancy;

public class TenantContext : ITenantContext
{
    public Guid TenantId { get; init; }
    public string Slug { get; init; } = string.Empty;
    public string ConnectionString { get; init; } = string.Empty;
    public bool HasTenant => !string.IsNullOrEmpty(Slug) && !string.IsNullOrEmpty(ConnectionString);

    public TenantContext() { }

    public TenantContext(Guid tenantId, string slug, string connectionString)
    {
        TenantId = tenantId;
        Slug = slug ?? throw new ArgumentNullException(nameof(slug));
        ConnectionString = connectionString ?? throw new ArgumentNullException(nameof(connectionString));
    }
}