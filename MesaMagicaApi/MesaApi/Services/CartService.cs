using MesaApi.Models;
using MesaApi.Services;
using MesaMagica.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using System.Collections.Generic;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;

namespace MesaMagicaApi.Services
{
    public class CartService : ICartService
    {
        private readonly ApplicationDbContext _context;
        private readonly IDistributedCache _redisCache;
        private readonly IOrderService _orderService;

        public CartService(ApplicationDbContext context, IDistributedCache redisCache, IOrderService orderService)
        {
            _context = context;
            _redisCache = redisCache;
            _orderService = orderService;
        }

        public async Task<List<CartItem>> GetCartAsync(Guid sessionId)
        {
            var cacheKey = $"cart_{sessionId}";

            // Try Redis cache first
            var cachedCart = await _redisCache.GetStringAsync(cacheKey);
            if (!string.IsNullOrEmpty(cachedCart))
            {
                return JsonSerializer.Deserialize<List<CartItem>>(cachedCart);
            }

            // Fetch from Postgres with related MenuItem data
            var cart = await _context.CartItems
                .Where(c => c.SessionId == sessionId)
                .Include(c => c.MenuItem) // Include MenuItem details
                .ToListAsync();

            // Cache in Redis (expire after 30 min)
            var serializedCart = JsonSerializer.Serialize(cart);
            await _redisCache.SetStringAsync(cacheKey, serializedCart, new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(30)
            });

            return cart;
        }

        public async Task AddToCartAsync(Guid sessionId, Guid itemId, int quantity)
        {
            var cacheKey = $"cart_{sessionId}";

            // Validate MenuItem exists
            var menuItem = await _context.MenuItems.FindAsync(itemId);
            if (menuItem == null)
            {
                throw new ArgumentException($"MenuItem with ID {itemId} not found.");
            }

            // Validate TableSession exists
            var session = await _context.TableSessions.FindAsync(sessionId);
            if (session == null || !session.IsActive)
            {
                throw new ArgumentException($"Session with ID {sessionId} not found or inactive.");
            }

            // Update Postgres
            var existingItem = await _context.CartItems
                .FirstOrDefaultAsync(c => c.SessionId == sessionId && c.ItemId == itemId);
            if (existingItem != null)
            {
                existingItem.Quantity += quantity;
            }
            else
            {
                _context.CartItems.Add(new CartItem
                {
                    SessionId = sessionId,
                    ItemId = itemId,
                    Quantity = quantity,
                    Session = session, // Set navigation property
                    MenuItem = menuItem // Set navigation property
                });
            }
            await _context.SaveChangesAsync();

            // Invalidate Redis cache
            await _redisCache.RemoveAsync(cacheKey);
        }

        public async Task RemoveFromCartAsync(Guid sessionId, Guid itemId)
        {
            var cacheKey = $"cart_{sessionId}";

            // Remove from Postgres
            var item = await _context.CartItems
                .FirstOrDefaultAsync(c => c.SessionId == sessionId && c.ItemId == itemId);
            if (item != null)
            {
                _context.CartItems.Remove(item);
                await _context.SaveChangesAsync();
            }

            // Invalidate Redis cache
            await _redisCache.RemoveAsync(cacheKey);
        }

        public async Task<OrderResponse> SubmitOrderAsync(Guid sessionId, string tableId, string tenantSlug, ClaimsPrincipal user)
        {
            var cacheKey = $"cart_{sessionId}";

            var cartItems = await _context.CartItems
                .Where(c => c.SessionId == sessionId)
                .Include(c => c.MenuItem)
                .ThenInclude(m => m.Category)
                .ToListAsync();

            if (!cartItems.Any())
            {
                throw new InvalidOperationException("Cannot submit an empty cart.");
            }

            // Validate items
            foreach (var item in cartItems)
            {
                if (item.MenuItem == null || !item.MenuItem.IsAvailable || !item.MenuItem.Category.IsActive)
                {
                    throw new InvalidOperationException($"MenuItem {item.ItemId} is not available or its category is inactive.");
                }
            }

            // Create order request with item details
            var orderRequest = new CreateOrderRequest
            {
                Items = cartItems.Select(c => new CreateOrderItemRequest
                {
                    ItemId = c.ItemId, // Convert string to Guid
                    ItemName = c.MenuItem.Name,
                    Price = c.MenuItem.Price,
                    Quantity = c.Quantity
                }).ToList()
            };

            // Call OrderService to create order
            var orderResponse = await _orderService.CreateOrderAsync(orderRequest, user, tenantSlug);

            // Clear cart
            _context.CartItems.RemoveRange(cartItems);
            await _context.SaveChangesAsync();

            await _redisCache.RemoveAsync(cacheKey);

            return orderResponse;
        }

        public async Task ClearCartAsync(Guid sessionId)
        {
            var cacheKey = $"cart_{sessionId}";

            // Clear cart in Postgres
            var cartItems = await _context.CartItems
                .Where(c => c.SessionId == sessionId)
                .ToListAsync();
            _context.CartItems.RemoveRange(cartItems);
            await _context.SaveChangesAsync();

            // Invalidate Redis cache
            await _redisCache.RemoveAsync(cacheKey);
        }

    }
}