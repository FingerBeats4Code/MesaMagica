namespace MesaApi.Multitenancy;
public interface ITenantContext
{
    Guid TenantId { get; }
    string Slug { get; }
    string ConnectionString { get; }
    bool HasTenant { get; }
}