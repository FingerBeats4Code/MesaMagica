namespace MesaApi.Models
{
    public class CartItem
    {
        public Guid Id { get; set; } = Guid.NewGuid(); // Primary key
        public Guid SessionId { get; set; } // Foreign key to Session
        public Guid ItemId { get; set; } // Foreign key to MenuItem
        public int Quantity { get; set; } = 1;
        public DateTime AddedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public required TableSession Session { get; set; } // Link to Session
        public required MenuItem MenuItem { get; set; } // Link to MenuItem
    }
}
