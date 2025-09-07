namespace MesaApi.Multitenancy;
public interface ITenantContext
{
    Guid TenantId { get; }
    string Slug { get; }
    string ConnectionString { get; }
    string TenantKey { get; }
    string LicenseKey { get; }
    DateTime? LicenseExpiration { get; }
    bool HasTenant { get; }
}