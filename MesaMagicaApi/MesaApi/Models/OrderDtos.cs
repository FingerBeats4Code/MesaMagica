namespace MesaApi.Models
{
    public class CreateOrderRequest
    {
        public List<CreateOrderItemRequest> Items { get; set; } = new List<CreateOrderItemRequest>();
    }

    public class CreateOrderItemRequest
    {
        public Guid ItemId { get; set; }
        public string ItemName { get; set; } = string.Empty; // Added
        public decimal Price { get; set; } // Added
        public int Quantity { get; set; }
    }

    public class OrderResponse
    {
        public Guid OrderId { get; set; }
        public Guid SessionId { get; set; }
        public string Status { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public List<OrderItemResponse> Items { get; set; } = new List<OrderItemResponse>();
    }

    public class OrderItemResponse
    {
        public Guid OrderItemId { get; set; }
        public Guid ItemId { get; set; }
        public string ItemName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal Price { get; set; }
    }

    public class UpdateOrderItemsRequest
    {
        public List<UpdateOrderItemRequest> Items { get; set; } = new List<UpdateOrderItemRequest>();
    }

    public class UpdateOrderItemRequest
    {
        public Guid ItemId { get; set; }
        public int Quantity { get; set; }
    }
}
