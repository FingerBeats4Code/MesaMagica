using MesaApi.Models;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;

namespace MesaMagicaApi.Services
{
    public interface ICartService
    {
        Task<List<CartItem>> GetCartAsync(Guid sessionId);
        Task AddToCartAsync(Guid sessionId, Guid itemId, int quantity);
        Task RemoveFromCartAsync(Guid sessionId, Guid itemId);
        Task<OrderResponse> SubmitOrderAsync(Guid sessionId, string tableId, string tenantSlug, ClaimsPrincipal user);
        Task ClearCartAsync(Guid sessionId);
    }
}