using MesaApi.Models;
using MesaApi.Services;
using MesaMagica.Api.Data;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;

namespace MesaMagicaApi.Services
{
    public class CartService : ICartService
    {
        private readonly ApplicationDbContext _context;
        private readonly IRedisService _redisService;
        private readonly IOrderService _orderService;

        public CartService(ApplicationDbContext context, IRedisService redisService, IOrderService orderService)
        {
            _context = context;
            _redisService = redisService;
            _orderService = orderService;
        }

        public async Task<List<CartItem>> GetCartAsync(Guid sessionId)
        {
            var cacheKey = $"cart_{sessionId}";

            // Try Redis cache first
            var cachedCart = await _redisService.GetAsync(cacheKey);
            if (!string.IsNullOrEmpty(cachedCart))
            {
                var cartItems = JsonSerializer.Deserialize<List<CartItem>>(cachedCart) ?? new List<CartItem>();
                return cartItems.Where(item => item.Quantity > 0).ToList();
            }

            // Fetch from Postgres
            var cart = await _context.CartItems
                .Where(c => c.SessionId == sessionId && c.Quantity > 0)
                .Include(c => c.MenuItem)
                .ToListAsync();

            await _redisService.SetAsync(cacheKey, JsonSerializer.Serialize(cart), TimeSpan.FromMinutes(30));
            return cart;
        }

        public async Task AddToCartAsync(Guid sessionId, Guid itemId, int quantity)
        {
            var cacheKey = $"cart_{sessionId}";

            var menuItem = await _context.MenuItems.FindAsync(itemId);
            if (menuItem == null)
                throw new ArgumentException($"MenuItem with ID {itemId} not found.");

            var session = await _context.TableSessions.FindAsync(sessionId);
            if (session == null || !session.IsActive)
                throw new ArgumentException($"Session with ID {sessionId} not found or inactive.");

            var existingItem = await _context.CartItems
                .FirstOrDefaultAsync(c => c.SessionId == sessionId && c.ItemId == itemId);
            if (existingItem != null)
            {
                existingItem.Quantity += quantity;
                if (existingItem.Quantity <= 0)
                {
                    _context.CartItems.Remove(existingItem); // Remove item if quantity <= 0
                }
            }
            else if (quantity > 0)
            {
                _context.CartItems.Add(new CartItem
                {
                    SessionId = sessionId,
                    ItemId = itemId,
                    Quantity = quantity,
                    Session = session,
                    MenuItem = menuItem
                });
            }

            await _context.SaveChangesAsync();
            await _redisService.RemoveAsync(cacheKey);
        }

        public async Task RemoveFromCartAsync(Guid sessionId, Guid itemId)
        {
            var cacheKey = $"cart_{sessionId}";

            var item = await _context.CartItems
                .FirstOrDefaultAsync(c => c.SessionId == sessionId && c.ItemId == itemId);
            if (item != null)
            {
                _context.CartItems.Remove(item);
                await _context.SaveChangesAsync();
            }

            await _redisService.RemoveAsync(cacheKey);
        }

        public async Task<OrderResponse> SubmitOrderAsync(Guid sessionId, string tableId, string tenantKey, ClaimsPrincipal user)
        {
            //-----------------------------changes for tenant validation-----------------
            // Verify tenant key in JWT matches tenantKey from TenantContext
            var userTenantKey = user.FindFirst("tenantKey")?.Value;
            if (string.IsNullOrEmpty(userTenantKey) || userTenantKey != tenantKey)
                throw new UnauthorizedAccessException("Tenant mismatch in JWT token.");
            //----------------------------------------------------------------------------

            var cacheKey = $"cart_{sessionId}";
            var cartItems = await _context.CartItems
                .Where(c => c.SessionId == sessionId)
                .Include(c => c.MenuItem)
                .ThenInclude(m => m.Category)
                .ToListAsync();

            if (!cartItems.Any())
                throw new InvalidOperationException("Cannot submit an empty cart.");

            foreach (var item in cartItems)
            {
                if (item.MenuItem == null || !item.MenuItem.IsAvailable || !item.MenuItem.Category.IsActive)
                    throw new InvalidOperationException($"MenuItem {item.ItemId} is not available or its category is inactive.");
            }

            var orderRequest = new CreateOrderRequest
            {
                Items = cartItems.Select(c => new CreateOrderItemRequest
                {
                    ItemId = c.ItemId,
                    ItemName = c.MenuItem.Name,
                    Price = c.MenuItem.Price,
                    Quantity = c.Quantity
                }).ToList()
            };

            var orderResponse = await _orderService.CreateOrderAsync(orderRequest, user, tenantKey);

            _context.CartItems.RemoveRange(cartItems);
            await _context.SaveChangesAsync();

            await _redisService.RemoveAsync(cacheKey);

            return orderResponse;
        }

        public async Task ClearCartAsync(Guid sessionId)
        {
            var cacheKey = $"cart_{sessionId}";

            var cartItems = await _context.CartItems
                .Where(c => c.SessionId == sessionId)
                .ToListAsync();

            _context.CartItems.RemoveRange(cartItems);
            await _context.SaveChangesAsync();

            await _redisService.RemoveAsync(cacheKey);
        }
    }
}
