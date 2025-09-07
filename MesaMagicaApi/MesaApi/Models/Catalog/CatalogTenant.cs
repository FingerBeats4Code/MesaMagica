namespace MesaApi.Model.Catalog
{
    public class Tenant
    {
        public Guid TenantId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public string ConnectionString { get; set; } = string.Empty;
        public string TenantKey { get; set; } = string.Empty;
        public string LicenseKey { get; set; } = string.Empty;
        public DateTime? LicenseExpiration { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
