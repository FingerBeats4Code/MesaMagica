namespace MesaApi.Model.Catalog
{
    public class Tenant
    {
        public Guid TenantId { get; set; }
        public string Name { get; set; } = null!;
        public string Slug { get; set; } = null!;
        public string ConnectionString { get; set; } = null!;
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
