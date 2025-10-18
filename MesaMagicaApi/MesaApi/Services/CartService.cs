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
        private readonly ILogger<CartService> _logger;

        public CartService(
            ApplicationDbContext context,
            IRedisService redisService,
            IOrderService orderService,
            ILogger<CartService> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _redisService = redisService ?? throw new ArgumentNullException(nameof(redisService));
            _orderService = orderService ?? throw new ArgumentNullException(nameof(orderService));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task<List<CartItem>> GetCartAsync(Guid sessionId)
        {
            var cacheKey = $"cart_{sessionId}";

            try
            {
                // Try Redis cache first
                var cachedCart = await _redisService.GetAsync(cacheKey);
                if (!string.IsNullOrEmpty(cachedCart))
                {
                    var cartDtos = JsonSerializer.Deserialize<List<CartItemDto>>(cachedCart);
                    if (cartDtos != null && cartDtos.Any())
                    {
                        _logger.LogDebug("Cart retrieved from cache for SessionId: {SessionId}", sessionId);
                        // Convert DTOs back to entities (for backward compatibility)
                        return await ConvertDtosToEntities(cartDtos);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to retrieve cart from cache for SessionId: {SessionId}", sessionId);
            }

            // Fetch from Postgres
            var cart = await _context.CartItems
                .Where(c => c.SessionId == sessionId && c.Quantity > 0)
                .Include(c => c.MenuItem)
                    .ThenInclude(m => m.Category)
                .ToListAsync();

            // Cache using DTOs
            if (cart.Any())
            {
                var cartDtos = cart.Select(c => new CartItemDto
                {
                    Id = c.Id,
                    SessionId = c.SessionId,
                    ItemId = c.ItemId,
                    Quantity = c.Quantity,
                    AddedAt = c.AddedAt,
                    ItemName = c.MenuItem?.Name ?? "",
                    ItemPrice = c.MenuItem?.Price ?? 0,
                    ItemImageUrl = c.MenuItem?.ImageUrl ?? "",
                    CategoryName = c.MenuItem?.Category?.Name ?? "",
                    IsAvailable = c.MenuItem?.IsAvailable ?? false
                }).ToList();

                try
                {
                    await _redisService.SetAsync(cacheKey, JsonSerializer.Serialize(cartDtos), TimeSpan.FromMinutes(30));
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to cache cart for SessionId: {SessionId}", sessionId);
                }
            }

            return cart;
        }

        public async Task AddToCartAsync(Guid sessionId, Guid itemId, int quantity)
        {
            var cacheKey = $"cart_{sessionId}";

            var menuItem = await _context.MenuItems
                .Include(m => m.Category)
                .FirstOrDefaultAsync(m => m.ItemId == itemId);

            if (menuItem == null)
                throw new ArgumentException($"MenuItem with ID {itemId} not found.");

            if (!menuItem.IsAvailable || !menuItem.Category.IsActive)
                throw new InvalidOperationException($"MenuItem '{menuItem.Name}' is not available.");

            var session = await _context.TableSessions.FindAsync(sessionId);
            if (session == null || !session.IsActive)
                throw new InvalidOperationException($"Session with ID {sessionId} not found or inactive.");

            var existingItem = await _context.CartItems
                .FirstOrDefaultAsync(c => c.SessionId == sessionId && c.ItemId == itemId);

            if (existingItem != null)
            {
                existingItem.Quantity += quantity;
                existingItem.AddedAt = DateTime.UtcNow;

                if (existingItem.Quantity <= 0)
                {
                    _context.CartItems.Remove(existingItem);
                    _logger.LogDebug("Removed cart item due to zero quantity. SessionId: {SessionId}, ItemId: {ItemId}",
                        sessionId, itemId);
                }
                else
                {
                    _logger.LogDebug("Updated cart item quantity. SessionId: {SessionId}, ItemId: {ItemId}, NewQuantity: {Quantity}",
                        sessionId, itemId, existingItem.Quantity);
                }
            }
            else if (quantity > 0)
            {
                _context.CartItems.Add(new CartItem
                {
                    Id = Guid.NewGuid(),
                    SessionId = sessionId,
                    ItemId = itemId,
                    Quantity = quantity,
                    AddedAt = DateTime.UtcNow,
                    Session = session,
                    MenuItem = menuItem
                });
                _logger.LogDebug("Added new cart item. SessionId: {SessionId}, ItemId: {ItemId}, Quantity: {Quantity}",
                    sessionId, itemId, quantity);
            }

            await _context.SaveChangesAsync();
            await InvalidateCacheAsync(sessionId);
        }

        public async Task RemoveFromCartAsync(Guid sessionId, Guid itemId)
        {
            var item = await _context.CartItems
                .FirstOrDefaultAsync(c => c.SessionId == sessionId && c.ItemId == itemId);

            if (item != null)
            {
                _context.CartItems.Remove(item);
                await _context.SaveChangesAsync();
                _logger.LogDebug("Removed cart item. SessionId: {SessionId}, ItemId: {ItemId}", sessionId, itemId);
            }

            await InvalidateCacheAsync(sessionId);
        }

        public async Task<OrderResponse> SubmitOrderAsync(Guid sessionId, string tableId, string tenantKey, ClaimsPrincipal user)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Validate tenant
                var userTenantKey = user.FindFirst("tenantKey")?.Value;
                if (string.IsNullOrEmpty(userTenantKey) || userTenantKey != tenantKey)
                    throw new UnauthorizedAccessException("Tenant mismatch in JWT token.");

                var cartItems = await _context.CartItems
                    .Where(c => c.SessionId == sessionId)
                    .Include(c => c.MenuItem)
                        .ThenInclude(m => m.Category)
                    .ToListAsync();

                if (!cartItems.Any())
                    throw new InvalidOperationException("Cannot submit an empty cart.");

                // Validate all items
                var unavailableItems = cartItems
                    .Where(c => c.MenuItem == null || !c.MenuItem.IsAvailable || !c.MenuItem.Category.IsActive)
                    .ToList();

                if (unavailableItems.Any())
                {
                    var itemNames = string.Join(", ", unavailableItems.Select(i => i.MenuItem?.Name ?? "Unknown"));
                    throw new InvalidOperationException(
                        $"The following items are no longer available: {itemNames}. Please remove them from your cart.");
                }

                var orderRequest = new CreateOrderRequest
                {
                    Items = cartItems.Select(c => new CreateOrderItemRequest
                    {
                        ItemId = c.ItemId,
                        ItemName = c.MenuItem!.Name,
                        Price = c.MenuItem.Price,
                        Quantity = c.Quantity
                    }).ToList()
                };

                var orderResponse = await _orderService.CreateOrderAsync(orderRequest, user, tenantKey);

                _context.CartItems.RemoveRange(cartItems);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();
                await InvalidateCacheAsync(sessionId);

                _logger.LogInformation("Order submitted successfully. SessionId: {SessionId}, OrderId: {OrderId}, Items: {ItemCount}",
                    sessionId, orderResponse.OrderId, cartItems.Count);

                return orderResponse;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Failed to submit order for SessionId: {SessionId}", sessionId);
                throw;
            }
        }

        public async Task ClearCartAsync(Guid sessionId)
        {
            var cartItems = await _context.CartItems
                .Where(c => c.SessionId == sessionId)
                .ToListAsync();

            if (cartItems.Any())
            {
                _context.CartItems.RemoveRange(cartItems);
                await _context.SaveChangesAsync();
                _logger.LogDebug("Cleared cart. SessionId: {SessionId}, Items removed: {Count}",
                    sessionId, cartItems.Count);
            }

            await InvalidateCacheAsync(sessionId);
        }

        private async Task<List<CartItem>> ConvertDtosToEntities(List<CartItemDto> dtos)
        {
            var itemIds = dtos.Select(d => d.ItemId).ToList();
            var menuItems = await _context.MenuItems
                .Include(m => m.Category)
                .Where(m => itemIds.Contains(m.ItemId))
                .ToDictionaryAsync(m => m.ItemId);

            var sessionIds = dtos.Select(d => d.SessionId).Distinct().ToList();
            var sessions = await _context.TableSessions
                .Where(s => sessionIds.Contains(s.SessionId))
                .ToDictionaryAsync(s => s.SessionId);

            return dtos.Select(dto => new CartItem
            {
                Id = dto.Id,
                SessionId = dto.SessionId,
                ItemId = dto.ItemId,
                Quantity = dto.Quantity,
                AddedAt = dto.AddedAt,
                MenuItem = menuItems.GetValueOrDefault(dto.ItemId)!,
                Session = sessions.GetValueOrDefault(dto.SessionId)!
            }).ToList();
        }

        private async Task InvalidateCacheAsync(Guid sessionId)
        {
            try
            {
                await _redisService.RemoveAsync($"cart_{sessionId}");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to invalidate cache for SessionId: {SessionId}", sessionId);
            }
        }
    }
}