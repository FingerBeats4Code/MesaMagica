using MesaApi.Models;
using MesaApi.Multitenancy;
using MesaMagica.Api.Data;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace MesaApi.Services
{
    public class OrderService : IOrderService
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly ITenantContext _tenantContext;
        private readonly ILogger<OrderService> _logger;

        public OrderService(ApplicationDbContext dbContext, ITenantContext tenantContext, ILogger<OrderService> logger)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _tenantContext = tenantContext ?? throw new ArgumentNullException(nameof(tenantContext));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task<OrderResponse> CreateOrderAsync(CreateOrderRequest request, ClaimsPrincipal user, string tenantSlug)
        {
            if (string.IsNullOrEmpty(tenantSlug))
                throw new ArgumentException("Tenant slug is missing.");

            if (request.Items == null || !request.Items.Any())
                throw new ArgumentException("Order must contain at least one item.");

            var sessionIdClaim = user.FindFirst("sessionId")?.Value;
            var tableIdClaim = user.FindFirst("tableId")?.Value;
            var userTenantSlug = user.FindFirst("tenantSlug")?.Value;

            if (string.IsNullOrEmpty(sessionIdClaim) || string.IsNullOrEmpty(tableIdClaim) || string.IsNullOrEmpty(userTenantSlug))
                throw new UnauthorizedAccessException("Invalid session or table information in token.");

            if (userTenantSlug != tenantSlug)
                throw new UnauthorizedAccessException("Tenant mismatch in request.");

            if (!Guid.TryParse(sessionIdClaim, out var sessionId) || !int.TryParse(tableIdClaim, out var tableId))
                throw new ArgumentException("Invalid sessionId or tableId format.");

            var session = await _dbContext.TableSessions
                .FirstOrDefaultAsync(s => s.SessionId == sessionId && s.TableId == tableId && s.IsActive == true);
            if (session == null)
                throw new ArgumentException("Active session not found for the specified table.");

            var menuItems = await _dbContext.MenuItems
                .Where(m => request.Items.Select(i => i.ItemId).Contains(m.ItemId) && m.IsAvailable && m.Category.IsActive)
                .ToListAsync();

            if (menuItems.Count != request.Items.Count)
                throw new ArgumentException("One or more menu items are invalid or unavailable.");

            var order = new Order
            {
                OrderId = Guid.NewGuid(),
                SessionId = sessionId,
                Status = "Pending",
                TotalAmount = 0,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                OrderItems = new List<OrderItem>()
            };

            foreach (var item in request.Items)
            {
                if (item.Quantity <= 0)
                    throw new ArgumentException($"Invalid quantity for item {item.ItemId}.");

                var menuItem = menuItems.First(m => m.ItemId == item.ItemId);
                order.OrderItems.Add(new OrderItem
                {
                    OrderItemId = Guid.NewGuid(),
                    OrderId = order.OrderId,
                    ItemId = menuItem.ItemId,
                    Quantity = item.Quantity,
                    Price = menuItem.Price
                });
                order.TotalAmount += item.Quantity * menuItem.Price;
            }

            _dbContext.Orders.Add(order);
            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("Order created. OrderId: {OrderId}, SessionId: {SessionId}, TenantSlug: {TenantSlug}",
                order.OrderId, sessionId, tenantSlug);

            return new OrderResponse
            {
                OrderId = order.OrderId,
                SessionId = order.SessionId,
                Status = order.Status,
                TotalAmount = order.TotalAmount,
                CreatedAt = order.CreatedAt,
                UpdatedAt = order.UpdatedAt,
                Items = order.OrderItems.Select(oi => new OrderItemResponse
                {
                    OrderItemId = oi.OrderItemId,
                    ItemId = oi.ItemId,
                    ItemName = menuItems.First(m => m.ItemId == oi.ItemId).Name,
                    Quantity = oi.Quantity,
                    Price = oi.Price
                }).ToList()
            };
        }

        public async Task<OrderResponse> GetOrderAsync(Guid orderId, ClaimsPrincipal user, string tenantSlug)
        {
            if (string.IsNullOrEmpty(tenantSlug))
                throw new ArgumentException("Tenant slug is missing.");

            var isAdmin = user.IsInRole("Admin");
            var sessionIdClaim = user.FindFirst("sessionId")?.Value;
            var userTenantSlug = user.FindFirst("tenantSlug")?.Value;

            if (string.IsNullOrEmpty(userTenantSlug) || userTenantSlug != tenantSlug)
                throw new UnauthorizedAccessException("Tenant mismatch in request.");

            var order = await _dbContext.Orders
                .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.MenuItem)
                .FirstOrDefaultAsync(o => o.OrderId == orderId);

            if (order == null)
                throw new ArgumentException("Order not found.");

            if (!isAdmin && (string.IsNullOrEmpty(sessionIdClaim) || !Guid.TryParse(sessionIdClaim, out var sessionId) || order.SessionId != sessionId))
                throw new UnauthorizedAccessException("You are not authorized to view this order.");

            return new OrderResponse
            {
                OrderId = order.OrderId,
                SessionId = order.SessionId,
                Status = order.Status,
                TotalAmount = order.TotalAmount,
                CreatedAt = order.CreatedAt,
                UpdatedAt = order.UpdatedAt,
                Items = order.OrderItems.Select(oi => new OrderItemResponse
                {
                    OrderItemId = oi.OrderItemId,
                    ItemId = oi.ItemId,
                    ItemName = oi.MenuItem.Name,
                    Quantity = oi.Quantity,
                    Price = oi.Price
                }).ToList()
            };
        }

        public async Task<List<OrderResponse>> GetOrdersBySessionAsync(Guid sessionId, ClaimsPrincipal user, string tenantSlug)
        {
            if (string.IsNullOrEmpty(tenantSlug))
                throw new ArgumentException("Tenant slug is missing.");

            var isAdmin = user.IsInRole("Admin");
            var sessionIdClaim = user.FindFirst("sessionId")?.Value;
            var userTenantSlug = user.FindFirst("tenantSlug")?.Value;

            if (string.IsNullOrEmpty(userTenantSlug) || userTenantSlug != tenantSlug)
                throw new UnauthorizedAccessException("Tenant mismatch in request.");

            if (!isAdmin && (string.IsNullOrEmpty(sessionIdClaim) || !Guid.TryParse(sessionIdClaim, out var userSessionId) || userSessionId != sessionId))
                throw new UnauthorizedAccessException("You are not authorized to view orders for this session.");

            var session = await _dbContext.TableSessions
                .FirstOrDefaultAsync(s => s.SessionId == sessionId && s.IsActive == true);
            if (session == null)
                throw new ArgumentException("Active session not found.");

            var orders = await _dbContext.Orders
                .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.MenuItem)
                .Where(o => o.SessionId == sessionId)
                .ToListAsync();

            return orders.Select(o => new OrderResponse
            {
                OrderId = o.OrderId,
                SessionId = o.SessionId,
                Status = o.Status,
                TotalAmount = o.TotalAmount,
                CreatedAt = o.CreatedAt,
                UpdatedAt = o.UpdatedAt,
                Items = o.OrderItems.Select(oi => new OrderItemResponse
                {
                    OrderItemId = oi.OrderItemId,
                    ItemId = oi.ItemId,
                    ItemName = oi.MenuItem.Name,
                    Quantity = oi.Quantity,
                    Price = oi.Price
                }).ToList()
            }).ToList();
        }

        public async Task<OrderResponse> UpdateOrderItemsAsync(Guid orderId, UpdateOrderItemsRequest request, ClaimsPrincipal user, string tenantSlug)
        {
            if (string.IsNullOrEmpty(tenantSlug))
                throw new ArgumentException("Tenant slug is missing.");

            if (request.Items == null || !request.Items.Any())
                throw new ArgumentException("Order must contain at least one item.");

            var isAdmin = user.IsInRole("Admin");
            var sessionIdClaim = user.FindFirst("sessionId")?.Value;
            var userTenantSlug = user.FindFirst("tenantSlug")?.Value;

            if (string.IsNullOrEmpty(userTenantSlug) || userTenantSlug != tenantSlug)
                throw new UnauthorizedAccessException("Tenant mismatch in request.");

            var order = await _dbContext.Orders
                .Include(o => o.OrderItems)
                .FirstOrDefaultAsync(o => o.OrderId == orderId);

            if (order == null)
                throw new ArgumentException("Order not found.");

            if (!isAdmin && (string.IsNullOrEmpty(sessionIdClaim) || !Guid.TryParse(sessionIdClaim, out var sessionId) || order.SessionId != sessionId))
                throw new UnauthorizedAccessException("You are not authorized to update this order.");

            if (order.Status == "Settled")
                throw new ArgumentException("Cannot update a settled order.");

            var menuItems = await _dbContext.MenuItems
                .Where(m => request.Items.Select(i => i.ItemId).Contains(m.ItemId) && m.IsAvailable && m.Category.IsActive)
                .ToListAsync();

            if (menuItems.Count != request.Items.Count)
                throw new ArgumentException("One or more menu items are invalid or unavailable.");

            _dbContext.OrderItems.RemoveRange(order.OrderItems);
            order.OrderItems.Clear();
            order.TotalAmount = 0;

            foreach (var item in request.Items)
            {
                if (item.Quantity <= 0)
                    throw new ArgumentException($"Invalid quantity for item {item.ItemId}.");

                var menuItem = menuItems.First(m => m.ItemId == item.ItemId);
                order.OrderItems.Add(new OrderItem
                {
                    OrderItemId = Guid.NewGuid(),
                    OrderId = order.OrderId,
                    ItemId = menuItem.ItemId,
                    Quantity = item.Quantity,
                    Price = menuItem.Price
                });
                order.TotalAmount += item.Quantity * menuItem.Price;
            }

            order.UpdatedAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("Order updated. OrderId: {OrderId}, TenantSlug: {TenantSlug}", order.OrderId, tenantSlug);

            return new OrderResponse
            {
                OrderId = order.OrderId,
                SessionId = order.SessionId,
                Status = order.Status,
                TotalAmount = order.TotalAmount,
                CreatedAt = order.CreatedAt,
                UpdatedAt = order.UpdatedAt,
                Items = order.OrderItems.Select(oi => new OrderItemResponse
                {
                    OrderItemId = oi.OrderItemId,
                    ItemId = oi.ItemId,
                    ItemName = menuItems.First(m => m.ItemId == oi.ItemId).Name,
                    Quantity = oi.Quantity,
                    Price = oi.Price
                }).ToList()
            };
        }
    }
}