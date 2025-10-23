namespace MesaApi.Models
{
    public class CartItemDto
    {
        public Guid Id { get; set; }
        public Guid SessionId { get; set; }
        public Guid ItemId { get; set; }
        public int Quantity { get; set; }
        public DateTime AddedAt { get; set; }

        // Flattened MenuItem properties
        public string ItemName { get; set; } = string.Empty;
        public decimal ItemPrice { get; set; }
        public string ItemImageUrl { get; set; } = string.Empty;
        public string CategoryName { get; set; } = string.Empty;
        public bool IsAvailable { get; set; }
    }

    public class CartSummaryDto
    {
        public Guid SessionId { get; set; }
        public List<CartItemDto> Items { get; set; } = new();
        public decimal TotalAmount => Items.Sum(i => i.ItemPrice * i.Quantity);
        public int TotalItems => Items.Sum(i => i.Quantity);
        public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    }
}