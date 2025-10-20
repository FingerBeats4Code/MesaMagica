// MesaMagicaApi/MesaApi/Services/AdminService.cs
using MesaApi.Common;
using MesaApi.Controllers;
using MesaApi.Models;
using MesaApi.Multitenancy;
using MesaMagica.Api.Data;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace MesaApi.Services
{
    public class AdminService : TenantAwareService, IAdminService
    {
        public AdminService(
            ApplicationDbContext dbContext,
            ITenantContext tenantContext,
            ILogger<AdminService> logger)
            : base(dbContext, tenantContext, logger)
        {
        }

        public async Task<List<ActiveOrderResponse>> GetActiveOrdersAsync(string tenantKey)
        {
            if (string.IsNullOrEmpty(tenantKey))
                throw new ArgumentException("Tenant key is missing.");

            var orders = await _dbContext.Orders
                .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.MenuItem)
                .Include(o => o.Session)
                    .ThenInclude(s => s.Table)
                .Where(o => o.Status != OrderStatus.Closed)
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync();

            return orders.Select(o => new ActiveOrderResponse
            {
                OrderId = o.OrderId,
                SessionId = o.SessionId,
                TableId = o.Session?.Table?.TableNumber ?? "Unknown",
                Status = o.Status,
                TotalAmount = o.TotalAmount,
                CreatedAt = o.CreatedAt,
                Items = o.OrderItems.Select(oi => new OrderItemResponse
                {
                    OrderItemId = oi.OrderItemId,
                    ItemId = oi.ItemId,
                    ItemName = oi.MenuItem?.Name ?? "Unknown",
                    Quantity = oi.Quantity,
                    Price = oi.Price
                }).ToList(),
                PaymentStatus = "pending" // TODO: Implement payment tracking
            }).ToList();
        }

        public async Task UpdateOrderStatusAsync(Guid orderId, string status, ClaimsPrincipal user, string tenantKey)
        {
            if (string.IsNullOrEmpty(tenantKey))
                throw new ArgumentException("Tenant key is missing.");

            // Validate user has staff or admin role
            if (!user.IsInRole(Roles.Admin) && !user.IsInRole(Roles.Staff))
                throw new UnauthorizedAccessException("Insufficient permissions");

            var order = await _dbContext.Orders
                .FirstOrDefaultAsync(o => o.OrderId == orderId);

            if (order == null)
                throw new ArgumentException("Order not found");

            // Validate status
            var validStatuses = new[] { OrderStatus.Pending, OrderStatus.Preparing, OrderStatus.Served, OrderStatus.Closed };
            if (!validStatuses.Contains(status))
                throw new ArgumentException($"Invalid status. Valid statuses: {string.Join(", ", validStatuses)}");

            order.Status = status;
            order.UpdatedAt = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("Order {OrderId} status updated to {Status} by {User}",
                orderId, status, user.Identity?.Name);
        }

        public async Task EditOrderAsync(Guid orderId, List<EditOrderItemRequest> items, ClaimsPrincipal user, string tenantKey)
        {
            if (string.IsNullOrEmpty(tenantKey))
                throw new ArgumentException("Tenant key is missing.");

            // Only admin can edit orders
            await ValidateAdminAndGetUserIdAsync(user, tenantKey);

            var order = await _dbContext.Orders
                .Include(o => o.OrderItems)
                .FirstOrDefaultAsync(o => o.OrderId == orderId);

            if (order == null)
                throw new ArgumentException("Order not found");

            // Cannot edit closed orders
            if (order.Status == OrderStatus.Closed)
                throw new InvalidOperationException("Cannot edit closed orders");

            // Update items
            foreach (var item in items)
            {
                var existingItem = order.OrderItems.FirstOrDefault(oi => oi.ItemId == item.ItemId);

                if (existingItem != null)
                {
                    if (item.Quantity <= 0)
                    {
                        _dbContext.OrderItems.Remove(existingItem);
                    }
                    else
                    {
                        existingItem.Quantity = item.Quantity;
                    }
                }
                else if (item.Quantity > 0)
                {
                    var menuItem = await _dbContext.MenuItems.FindAsync(item.ItemId);
                    if (menuItem == null || !menuItem.IsAvailable)
                        throw new ArgumentException($"Menu item {item.ItemId} not available");

                    order.OrderItems.Add(new OrderItem
                    {
                        OrderItemId = Guid.NewGuid(),
                        OrderId = orderId,
                        ItemId = item.ItemId,
                        Quantity = item.Quantity,
                        Price = menuItem.Price
                    });
                }
            }

            // Recalculate total
            order.TotalAmount = order.OrderItems.Sum(oi => oi.Price * oi.Quantity);
            order.UpdatedAt = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("Order {OrderId} edited by admin {User}", orderId, user.Identity?.Name);
        }

        public async Task EditCartAsync(Guid sessionId, Guid itemId, int quantity, ClaimsPrincipal user, string tenantKey)
        {
            if (string.IsNullOrEmpty(tenantKey))
                throw new ArgumentException("Tenant key is missing.");

            // Only admin can edit carts
            await ValidateAdminAndGetUserIdAsync(user, tenantKey);

            var cartItem = await _dbContext.CartItems
                .FirstOrDefaultAsync(c => c.SessionId == sessionId && c.ItemId == itemId);

            if (cartItem != null)
            {
                if (quantity <= 0)
                {
                    _dbContext.CartItems.Remove(cartItem);
                }
                else
                {
                    cartItem.Quantity = quantity;
                    cartItem.AddedAt = DateTime.UtcNow;
                }
            }
            else if (quantity > 0)
            {
                var menuItem = await _dbContext.MenuItems.FindAsync(itemId);
                if (menuItem == null || !menuItem.IsAvailable)
                    throw new ArgumentException("Menu item not available");

                var session = await _dbContext.TableSessions.FindAsync(sessionId);
                if (session == null)
                    throw new ArgumentException("Session not found");

                _dbContext.CartItems.Add(new CartItem
                {
                    Id = Guid.NewGuid(),
                    SessionId = sessionId,
                    ItemId = itemId,
                    Quantity = quantity,
                    AddedAt = DateTime.UtcNow,
                    Session = session,
                    MenuItem = menuItem
                });
            }

            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("Cart for session {SessionId} edited by admin {User}",
                sessionId, user.Identity?.Name);
        }

        public async Task<PaymentResponse> GetPaymentDetailsAsync(Guid orderId, ClaimsPrincipal user, string tenantKey)
        {
            if (string.IsNullOrEmpty(tenantKey))
                throw new ArgumentException("Tenant key is missing.");

            // Validate user has staff or admin role
            if (!user.IsInRole(Roles.Admin) && !user.IsInRole(Roles.Staff))
                throw new UnauthorizedAccessException("Insufficient permissions");

            var order = await _dbContext.Orders
                .FirstOrDefaultAsync(o => o.OrderId == orderId);

            if (order == null)
                throw new ArgumentException("Order not found");

            // TODO: Implement actual payment tracking
            // For now, return mock data
            return new PaymentResponse
            {
                OrderId = orderId,
                PaymentStatus = order.Status == OrderStatus.Closed ? "paid" : "pending",
                AmountPaid = order.Status == OrderStatus.Closed ? order.TotalAmount : 0,
                TransactionId = $"TXN-{orderId.ToString()[..8]}-{DateTime.UtcNow:yyyyMMdd}",
                PaymentDate = order.Status == OrderStatus.Closed ? order.UpdatedAt : null
            };
        }
    }
}