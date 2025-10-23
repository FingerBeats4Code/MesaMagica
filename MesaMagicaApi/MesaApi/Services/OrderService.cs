using MesaApi.Common;
using MesaApi.Models;
using MesaApi.Services.Notifications;
using MesaMagica.Api.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace MesaApi.Services
{
    public class OrderService : IOrderService
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly ILogger<OrderService> _logger;
        private readonly INotificationService _notificationService; // ADD THIS
        public OrderService(ApplicationDbContext dbContext, ILogger<OrderService> logger, INotificationService notificationService)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _notificationService = notificationService; // ADD THIS
        }

        public async Task<OrderResponse> CreateOrderAsync(CreateOrderRequest request, ClaimsPrincipal user, string tenantKey)
        {
            if (request == null || !request.Items.Any())
                throw new ArgumentException("Order request must contain at least one item.");

            //------------------changes for consistent tenant validation from JWT only----------------------
            var userTenantKey = user.FindFirst(JwtClaims.TenantKey)?.Value;
            if (string.IsNullOrEmpty(userTenantKey) || userTenantKey != tenantKey)
                throw new UnauthorizedAccessException("Tenant mismatch.");

            var sessionIdClaim = user.FindFirst(JwtClaims.SessionId)?.Value;
            if (!Guid.TryParse(sessionIdClaim, out var sessionId))
                throw new InvalidOperationException("Invalid or missing sessionId in JWT.");
            //------------------end changes----------------------

            var session = await _dbContext.TableSessions
                .FirstOrDefaultAsync(s => s.SessionId == sessionId && s.IsActive);
            if (session == null)
                throw new InvalidOperationException($"Session {sessionId} not found or inactive for tenant {tenantKey}.");

            //------------------changes for using constants----------------------
            var order = new Order
            {
                OrderId = Guid.NewGuid(),
                SessionId = sessionId,
                Status = OrderStatus.Pending,
                TotalAmount = request.Items.Sum(i => i.Price * i.Quantity),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                OrderItems = request.Items.Select(i => new OrderItem
                {
                    OrderItemId = Guid.NewGuid(),
                    OrderId = Guid.NewGuid(),
                    ItemId = i.ItemId,
                    Quantity = i.Quantity,
                    Price = i.Price
                }).ToList()
            };
            //------------------end changes----------------------

            _dbContext.Orders.Add(order);
            await _dbContext.SaveChangesAsync();
            // ===== ADD SIGNALR NOTIFICATION =====
            // Get table number for notification
            var thissession = await _dbContext.TableSessions
                .Include(s => s.Table)
                .FirstOrDefaultAsync(s => s.SessionId == sessionId);

            var tableNumber = thissession?.Table?.TableNumber ?? "Unknown";

            // Notify admins of new order
            await _notificationService.NotifyNewOrder(
                tenantKey,
                order.OrderId,
                tableNumber,
                new
                {
                    orderId = order.OrderId,
                    tableNumber = tableNumber,
                    totalAmount = order.TotalAmount,
                    itemCount = order.OrderItems.Count,
                    items = order.OrderItems.Select(oi => new
                    {
                        itemId = oi.ItemId,
                        name = request.Items.First(i => i.ItemId == oi.ItemId).ItemName,
                        quantity = oi.Quantity,
                        price = oi.Price
                    }).ToList()
                });
            // ===== END SIGNALR NOTIFICATION =====
            _logger.LogInformation("Order created. OrderId: {OrderId}, SessionId: {SessionId}, TenantKey: {TenantKey}",
                order.OrderId, sessionId, tenantKey);

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
                    ItemName = request.Items.First(i => i.ItemId == oi.ItemId).ItemName,
                    Quantity = oi.Quantity,
                    Price = oi.Price
                }).ToList()
            };
        }

        public async Task<OrderResponse> GetOrderAsync(Guid orderId, ClaimsPrincipal user, string tenantKey)
        {
            //------------------changes for consistent tenant validation from JWT only----------------------
            var userTenantKey = user.FindFirst(JwtClaims.TenantKey)?.Value;
            if (string.IsNullOrEmpty(userTenantKey) || userTenantKey != tenantKey)
                throw new UnauthorizedAccessException("Tenant mismatch.");

            var sessionIdClaim = user.FindFirst(JwtClaims.SessionId)?.Value;
            if (!Guid.TryParse(sessionIdClaim, out var sessionId))
                throw new InvalidOperationException("Invalid or missing sessionId in JWT.");
            //------------------end changes----------------------

            var order = await _dbContext.Orders
                .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.MenuItem)
                .FirstOrDefaultAsync(o => o.OrderId == orderId && o.SessionId == sessionId);

            if (order == null)
                throw new KeyNotFoundException($"Order {orderId} not found for tenant {tenantKey}.");

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
                    ItemName = oi.MenuItem?.Name ?? string.Empty,
                    Quantity = oi.Quantity,
                    Price = oi.Price
                }).ToList()
            };
        }

        public async Task<List<OrderResponse>> GetOrdersBySessionAsync(Guid sessionId, ClaimsPrincipal user, string tenantKey)
        {
            //------------------changes for consistent tenant validation from JWT only----------------------
            var userTenantKey = user.FindFirst(JwtClaims.TenantKey)?.Value;
            if (string.IsNullOrEmpty(userTenantKey) || userTenantKey != tenantKey)
                throw new UnauthorizedAccessException("Tenant mismatch.");

            var claimSessionId = user.FindFirst(JwtClaims.SessionId)?.Value;
            if (!Guid.TryParse(claimSessionId, out var parsedSessionId) || parsedSessionId != sessionId)
                throw new InvalidOperationException("Invalid sessionId in JWT.");
            //------------------end changes----------------------

            var orders = await _dbContext.Orders
                .Where(o => o.SessionId == sessionId)
                .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.MenuItem)
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
                    ItemName = oi.MenuItem?.Name ?? string.Empty,
                    Quantity = oi.Quantity,
                    Price = oi.Price
                }).ToList()
            }).ToList();
        }

        public async Task<OrderResponse> UpdateOrderItemsAsync(Guid orderId, UpdateOrderItemsRequest request, ClaimsPrincipal user, string tenantKey)
        {
            //------------------changes for consistent tenant validation from JWT only----------------------
            var userTenantKey = user.FindFirst(JwtClaims.TenantKey)?.Value;
            if (string.IsNullOrEmpty(userTenantKey) || userTenantKey != tenantKey)
                throw new UnauthorizedAccessException("Tenant mismatch.");

            var sessionIdClaim = user.FindFirst(JwtClaims.SessionId)?.Value;
            if (!Guid.TryParse(sessionIdClaim, out var sessionId))
                throw new InvalidOperationException("Invalid or missing sessionId in JWT.");
            //------------------end changes----------------------

            var order = await _dbContext.Orders
                .Include(o => o.OrderItems)
                .FirstOrDefaultAsync(o => o.OrderId == orderId && o.SessionId == sessionId);

            if (order == null)
                throw new KeyNotFoundException($"Order {orderId} not found for tenant {tenantKey}.");

            var menuItems = await _dbContext.MenuItems
                .Where(m => request.Items.Select(i => i.ItemId).Contains(m.ItemId) && m.IsAvailable && m.Category.IsActive)
                .ToListAsync();

            foreach (var item in request.Items)
            {
                var menuItem = menuItems.FirstOrDefault(m => m.ItemId == item.ItemId);
                if (menuItem == null)
                    throw new ArgumentException($"MenuItem {item.ItemId} not found or unavailable.");

                var existingItem = order.OrderItems.FirstOrDefault(oi => oi.ItemId == item.ItemId);
                if (existingItem != null)
                {
                    existingItem.Quantity = item.Quantity;
                    existingItem.Price = menuItem.Price;
                }
                else
                {
                    order.OrderItems.Add(new OrderItem
                    {
                        OrderItemId = Guid.NewGuid(),
                        OrderId = order.OrderId,
                        ItemId = item.ItemId,
                        Quantity = item.Quantity,
                        Price = menuItem.Price
                    });
                }
            }

            order.OrderItems.RemoveAll(oi => !request.Items.Any(i => i.ItemId == oi.ItemId));
            order.TotalAmount = order.OrderItems.Sum(oi => oi.Price * oi.Quantity);
            order.UpdatedAt = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync();

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