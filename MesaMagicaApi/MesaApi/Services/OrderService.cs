using MesaApi.Models;
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

        public OrderService(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
        }

        public async Task<OrderResponse> CreateOrderAsync(CreateOrderRequest request, ClaimsPrincipal user, string tenantKey)
        {
            if (request == null || !request.Items.Any())
                throw new ArgumentException("Order request must contain at least one item.");

            // Validate tenant
            var userTenantKey = user.FindFirst("tenantKey")?.Value;
            if (string.IsNullOrEmpty(userTenantKey) || userTenantKey != tenantKey)
                throw new UnauthorizedAccessException("Tenant mismatch.");

            // Validate session from user claims
            var sessionIdClaim = user.FindFirst("sessionId")?.Value;
            if (!Guid.TryParse(sessionIdClaim, out var sessionId))
                throw new InvalidOperationException("Invalid or missing sessionId in JWT.");

            var session = await _dbContext.TableSessions
                .FirstOrDefaultAsync(s => s.SessionId == sessionId && s.IsActive);
            if (session == null)
                throw new InvalidOperationException($"Session {sessionId} not found or inactive for tenant {tenantKey}.");

            // Create order
            var order = new Order
            {
                OrderId = Guid.NewGuid(),
                SessionId = sessionId,
                Status = "Pending",
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

            _dbContext.Orders.Add(order);
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
                    ItemName = request.Items.First(i => i.ItemId == oi.ItemId).ItemName,
                    Quantity = oi.Quantity,
                    Price = oi.Price
                }).ToList()
            };
        }

        public async Task<OrderResponse> GetOrderAsync(Guid orderId, ClaimsPrincipal user, string tenantKey)
        {
            var userTenantKey = user.FindFirst("tenantKey")?.Value;
            if (string.IsNullOrEmpty(userTenantKey) || userTenantKey != tenantKey)
                throw new UnauthorizedAccessException("Tenant mismatch.");

            var sessionIdClaim = user.FindFirst("sessionId")?.Value;
            if (!Guid.TryParse(sessionIdClaim, out var sessionId))
                throw new InvalidOperationException("Invalid or missing sessionId in JWT.");

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
            var userTenantKey = user.FindFirst("tenantKey")?.Value;
            if (string.IsNullOrEmpty(userTenantKey) || userTenantKey != tenantKey)
                throw new UnauthorizedAccessException("Tenant mismatch.");

            var claimSessionId = user.FindFirst("sessionId")?.Value;
            if (!Guid.TryParse(claimSessionId, out var parsedSessionId) || parsedSessionId != sessionId)
                throw new InvalidOperationException("Invalid sessionId in JWT.");

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
            var userTenantKey = user.FindFirst("tenantKey")?.Value;
            if (string.IsNullOrEmpty(userTenantKey) || userTenantKey != tenantKey)
                throw new UnauthorizedAccessException("Tenant mismatch.");

            var sessionIdClaim = user.FindFirst("sessionId")?.Value;
            if (!Guid.TryParse(sessionIdClaim, out var sessionId))
                throw new InvalidOperationException("Invalid or missing sessionId in JWT.");

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
