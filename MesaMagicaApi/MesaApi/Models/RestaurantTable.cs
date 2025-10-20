namespace MesaApi.Models
{
    public class RestaurantTable
    {
        public Guid TableId { get; set; } = Guid.NewGuid(); // CHANGED from int
        public string TableNumber { get; set; } = null!; // Display name like "T1", "Table 1", etc.
        public string QRCodeUrl { get; set; } = null!;
        public bool IsOccupied { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public int TableSeatSize { get; set; } = 4;
    }
}
