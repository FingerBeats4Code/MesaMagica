// MesaMagicaApi/MesaApi/Services/AdminService.cs
using MesaApi.Common;
using MesaApi.Controllers;
using MesaApi.Models;
using MesaApi.Multitenancy;
using MesaMagica.Api.Data;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using MesaApi.Services.Notifications;
namespace MesaApi.Services
{
    
    public class AdminService : TenantAwareService, IAdminService
    {
        private readonly INotificationService _notificationService;
        public AdminService(
            ApplicationDbContext dbContext,
            ITenantContext tenantContext,
            ILogger<AdminService> logger,
           INotificationService notificationService) // ADD THIS
            : base(dbContext, tenantContext, logger)
        {
            _notificationService = notificationService; // ADD THIS
        }

        public async Task<List<ActiveOrderResponse>> GetActiveOrdersAsync(string tenantKey)
        {
            if (string.IsNullOrEmpty(tenantKey))
                throw new ArgumentException("Tenant key is missing.");

            // Get TODAY'S orders (including closed ones for display)
            var today = DateTime.UtcNow.Date;
            var tomorrow = today.AddDays(1);

            var orders = await _dbContext.Orders
                .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.MenuItem)
                .Include(o => o.Session)
                    .ThenInclude(s => s.Table)
                .Where(o => o.CreatedAt >= today && o.CreatedAt < tomorrow)
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
                PaymentStatus = o.Status == OrderStatus.Closed ? "paid" : "pending"
            }).ToList();
        }

        public async Task UpdateOrderStatusAsync(Guid orderId, string status, ClaimsPrincipal user, string tenantKey)
        {
            if (string.IsNullOrEmpty(tenantKey))
                throw new ArgumentException("Tenant key is missing.");

            if (!user.IsInRole(Roles.Admin) && !user.IsInRole(Roles.Staff))
                throw new UnauthorizedAccessException("Insufficient permissions");

            var order = await _dbContext.Orders
                .Include(o => o.Session)
                    .ThenInclude(s => s.Table)
                .FirstOrDefaultAsync(o => o.OrderId == orderId);

            if (order == null)
                throw new ArgumentException("Order not found");

            var validStatuses = new[] { OrderStatus.Pending, OrderStatus.Preparing, OrderStatus.Served, OrderStatus.Closed };
            if (!validStatuses.Contains(status))
                throw new ArgumentException($"Invalid status. Valid statuses: {string.Join(", ", validStatuses)}");

            var previousStatus = order.Status;
            order.Status = status;
            order.UpdatedAt = DateTime.UtcNow;

            // FIXED: Only close session when ALL orders are closed
            if (status.Equals(OrderStatus.Closed, StringComparison.OrdinalIgnoreCase) && order.Session != null)
            {
                var session = order.Session;

                _logger.LogInformation(
                    "Order {OrderId} closed. Checking if all orders for session {SessionId} are closed",
                    orderId,
                    session.SessionId
                );

                // Check if there are any other unpaid orders in this session
                var hasUnpaidOrders = await _dbContext.Orders
                    .AnyAsync(o => o.SessionId == session.SessionId &&
                                  o.OrderId != orderId &&
                                  o.Status != OrderStatus.Closed);

                if (!hasUnpaidOrders)
                {
                    // All orders are closed - close the session
                    _logger.LogInformation(
                        "All orders closed for session {SessionId}. Closing session and freeing table {TableId}",
                        session.SessionId,
                        session.TableId
                    );

                    session.IsActive = false;
                    session.EndedAt = DateTime.UtcNow;
                    session.SessionCount = 0;

                    if (session.Table != null)
                    {
                        session.Table.IsOccupied = false;
                        _dbContext.RestaurantTables.Update(session.Table);
                    }

                    _dbContext.TableSessions.Update(session);

                    // Clear cart items
                    var cartItems = await _dbContext.CartItems
                        .Where(c => c.SessionId == session.SessionId)
                        .ToListAsync();

                    if (cartItems.Any())
                    {
                        _dbContext.CartItems.RemoveRange(cartItems);
                    }
                }
                else
                {
                    _logger.LogInformation(
                        "Order {OrderId} closed but session {SessionId} still has unpaid orders. Session remains active.",
                        orderId,
                        session.SessionId
                    );
                }
            }

            await _dbContext.SaveChangesAsync();
            // ===== ADD SIGNALR NOTIFICATION =====
            await _notificationService.NotifyOrderStatusChanged(
                tenantKey,
                orderId,
                status,
                new
                {
                    orderId = order.OrderId,
                    status = order.Status,
                    tableNumber = order.Session?.Table?.TableNumber ?? "Unknown",
                    totalAmount = order.TotalAmount,
                    previousStatus = previousStatus,
                    items = order.OrderItems.Select(oi => new
                    {
                        name = oi.MenuItem?.Name ?? "Unknown",
                        quantity = oi.Quantity
                    }).ToList()
                });

            // Also notify customer
            if (order.Session != null)
            {
                await _notificationService.NotifyCustomerOrderUpdate(
                    tenantKey,
                    order.SessionId,
                    status,
                    new
                    {
                        orderId = order.OrderId,
                        status = order.Status,
                        totalAmount = order.TotalAmount
                    });
            }
            // ===== END SIGNALR NOTIFICATION =====
            _logger.LogInformation(
                "Order {OrderId} status updated from {PreviousStatus} to {Status} by {User}",
                orderId,
                previousStatus,
                status,
                user.Identity?.Name
            );
        }

        public async Task EditOrderAsync(Guid orderId, List<EditOrderItemRequest> items, ClaimsPrincipal user, string tenantKey)
        {
            if (string.IsNullOrEmpty(tenantKey))
                throw new ArgumentException("Tenant key is missing.");

            await ValidateAdminAndGetUserIdAsync(user, tenantKey);

            var order = await _dbContext.Orders
                .Include(o => o.OrderItems)
                .FirstOrDefaultAsync(o => o.OrderId == orderId);

            if (order == null)
                throw new ArgumentException("Order not found");

            if (order.Status == OrderStatus.Closed)
                throw new InvalidOperationException("Cannot edit closed orders");

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

            order.TotalAmount = order.OrderItems.Sum(oi => oi.Price * oi.Quantity);
            order.UpdatedAt = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("Order {OrderId} edited by admin {User}", orderId, user.Identity?.Name);
        }

        public async Task EditCartAsync(Guid sessionId, Guid itemId, int quantity, ClaimsPrincipal user, string tenantKey)
        {
            if (string.IsNullOrEmpty(tenantKey))
                throw new ArgumentException("Tenant key is missing.");

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

            if (!user.IsInRole(Roles.Admin) && !user.IsInRole(Roles.Staff))
                throw new UnauthorizedAccessException("Insufficient permissions");

            var order = await _dbContext.Orders
                .FirstOrDefaultAsync(o => o.OrderId == orderId);

            if (order == null)
                throw new ArgumentException("Order not found");

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