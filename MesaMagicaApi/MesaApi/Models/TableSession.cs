namespace MesaApi.Models
{
    public class TableSession
    {
        public int SessionId { get; set; }
        public int TableId { get; set; }
        public RestaurantTable? Table { get; set; }
        public Guid SessionToken { get; set; } = Guid.NewGuid();
        public bool IsActive { get; set; } = true;
        public DateTime StartedAt { get; set; } = DateTime.UtcNow;
        public DateTime? EndedAt { get; set; }
    }
}
