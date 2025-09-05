namespace MesaApi.Models
{
    public class Order
    {
        public Guid OrderId { get; set; }
        public Guid SessionId { get; set; } 
        public TableSession? Session { get; set; }
        public string Status { get; set; } = "Pending"; // Pending, Preparing, Served, Closed
        public decimal TotalAmount { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public List<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
    }

}
