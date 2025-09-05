using MesaApi.Models;
using System.Security.Claims;

namespace MesaApi.Services
{
    public interface IOrderService
    {
        Task<OrderResponse> CreateOrderAsync(CreateOrderRequest request, ClaimsPrincipal user, string tenantSlug);
        Task<OrderResponse> GetOrderAsync(Guid orderId, ClaimsPrincipal user, string tenantSlug);
        Task<List<OrderResponse>> GetOrdersBySessionAsync(Guid sessionId, ClaimsPrincipal user, string tenantSlug);
        Task<OrderResponse> UpdateOrderItemsAsync(Guid orderId, UpdateOrderItemsRequest request, ClaimsPrincipal user, string tenantSlug);
    }

}
