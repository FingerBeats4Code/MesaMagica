namespace MesaApi.Models
{
    public class RestaurantTable
    {
        public int TableId { get; set; }
        public string TableNumber { get; set; } = null!;
        public string QRCodeUrl { get; set; } = null!;
        public bool IsOccupied { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
