using MesaApi.Multitenancy;

public class TenantContext : ITenantContext
{
    public Guid TenantId { get; internal set; }
    public string Slug { get; internal set; } = "";
    public string ConnectionString { get; internal set; } = "";
    public bool HasTenant => TenantId != Guid.Empty && !string.IsNullOrWhiteSpace(ConnectionString);
}