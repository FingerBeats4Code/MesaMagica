// MesaMagicaApi/MesaApi/Services/IAdminService.cs
using MesaApi.Controllers;
using MesaApi.Models;
using System.Security.Claims;

namespace MesaApi.Services
{
    public interface IAdminService
    {
        Task<List<ActiveOrderResponse>> GetActiveOrdersAsync(string tenantKey);
        Task UpdateOrderStatusAsync(Guid orderId, string status, ClaimsPrincipal user, string tenantKey);
        Task EditOrderAsync(Guid orderId, List<EditOrderItemRequest> items, ClaimsPrincipal user, string tenantKey);
        Task EditCartAsync(Guid sessionId, Guid itemId, int quantity, ClaimsPrincipal user, string tenantKey);
        Task<PaymentResponse> GetPaymentDetailsAsync(Guid orderId, ClaimsPrincipal user, string tenantKey);
    }

    public class ActiveOrderResponse
    {
        public Guid OrderId { get; set; }
        public Guid SessionId { get; set; }
        public string TableId { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<OrderItemResponse> Items { get; set; } = new();
        public string PaymentStatus { get; set; } = "pending";
    }

    public class PaymentResponse
    {
        public Guid OrderId { get; set; }
        public string PaymentStatus { get; set; } = string.Empty;
        public decimal AmountPaid { get; set; }
        public string TransactionId { get; set; } = string.Empty;
        public DateTime? PaymentDate { get; set; }
    }
}