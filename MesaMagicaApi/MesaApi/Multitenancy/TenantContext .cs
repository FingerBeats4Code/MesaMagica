using MesaApi.Multitenancy;

public class TenantContext : ITenantContext
{
    public TenantContext(Guid tenantId, string slug, string connectionString, string tenantKey = "", string licenseKey = "", DateTime? licenseExpiration = null)
    {
        TenantId = tenantId;
        Slug = slug;
        ConnectionString = connectionString;
        TenantKey = tenantKey;
        LicenseKey = licenseKey;
        LicenseExpiration = licenseExpiration;
        HasTenant = true;
    }

    public Guid TenantId { get; }
    public string Slug { get; }
    public string ConnectionString { get; }
    public string TenantKey { get; }
    public string LicenseKey { get; }
    public DateTime? LicenseExpiration { get; }
    public bool HasTenant { get; }
}