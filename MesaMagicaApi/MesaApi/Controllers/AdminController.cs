// MesaMagicaApi/MesaApi/Controllers/AdminController.cs
using MesaApi.Common;
using MesaApi.Models;
using MesaApi.Multitenancy;
using MesaApi.Services;
using MesaMagica.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace MesaApi.Controllers
{
    [Route("api/admin")]
    [ApiController]
    [Authorize(Roles = "Admin,Staff")]
    public class AdminController : ControllerBase
    {
        private readonly IAdminService _adminService;
        private readonly ITenantContext _tenantContext;
        private readonly ILogger<AdminController> _logger;
        private readonly ApplicationDbContext _dbContext;

        public AdminController(
            IAdminService adminService,
            ITenantContext tenantContext,
            ILogger<AdminController> logger,
            ApplicationDbContext dbContext)
        {
            _adminService = adminService;
            _tenantContext = tenantContext;
            _logger = logger;
            _dbContext = dbContext;
        }

        // GET: api/admin/orders/active
        [HttpGet("orders/active")]
        public async Task<IActionResult> GetActiveOrders()
        {
            var tenantKey = User.FindFirst(JwtClaims.TenantKey)?.Value;
            if (string.IsNullOrEmpty(tenantKey))
                return Unauthorized("Tenant key not found in JWT.");

            try
            {
                var orders = await _adminService.GetActiveOrdersAsync(tenantKey);
                return Ok(orders);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching active orders");
                return StatusCode(500, "Error fetching active orders");
            }
        }

        // ADDED: Get specific order details
        [HttpGet("order/{orderId}")]
        public async Task<IActionResult> GetOrder(Guid orderId)
        {
            var tenantKey = User.FindFirst(JwtClaims.TenantKey)?.Value;
            if (string.IsNullOrEmpty(tenantKey))
                return Unauthorized("Tenant key not found in JWT.");

            try
            {
                var order = await _dbContext.Orders
                    .Include(o => o.OrderItems)
                        .ThenInclude(oi => oi.MenuItem)
                    .Include(o => o.Session)
                        .ThenInclude(s => s.Table)
                    .FirstOrDefaultAsync(o => o.OrderId == orderId);

                if (order == null)
                    return NotFound(new { message = "Order not found" });

                return Ok(new
                {
                    order.OrderId,
                    order.SessionId,
                    TableId = order.Session?.Table?.TableNumber ?? "Unknown",
                    order.Status,
                    order.TotalAmount,
                    order.CreatedAt,
                    order.UpdatedAt,
                    Items = order.OrderItems.Select(oi => new
                    {
                        oi.OrderItemId,
                        oi.ItemId,
                        ItemName = oi.MenuItem?.Name ?? "Unknown",
                        oi.Quantity,
                        oi.Price
                    })
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching order {OrderId}", orderId);
                return StatusCode(500, "Error fetching order");
            }
        }

        // PUT: api/admin/order/update
        [HttpPut("order/update")]
        public async Task<IActionResult> UpdateOrderStatus([FromBody] UpdateOrderStatusRequest request)
        {
            var tenantKey = User.FindFirst(JwtClaims.TenantKey)?.Value;
            if (string.IsNullOrEmpty(tenantKey))
                return Unauthorized("Tenant key not found in JWT.");

            try
            {
                await _adminService.UpdateOrderStatusAsync(request.OrderId, request.Status, User, tenantKey);
                return Ok(new { message = "Order status updated successfully" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating order status");
                return StatusCode(500, "Error updating order status");
            }
        }

        // PUT: api/admin/order/edit
        [HttpPut("order/edit")]
        public async Task<IActionResult> EditOrder([FromBody] EditOrderRequest request)
        {
            var tenantKey = User.FindFirst(JwtClaims.TenantKey)?.Value;
            if (string.IsNullOrEmpty(tenantKey))
                return Unauthorized("Tenant key not found in JWT.");

            try
            {
                await _adminService.EditOrderAsync(request.OrderId, request.Items, User, tenantKey);
                return Ok(new { message = "Order updated successfully" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error editing order");
                return StatusCode(500, "Error editing order");
            }
        }

        // PUT: api/admin/cart/edit
        [HttpPut("cart/edit")]
        public async Task<IActionResult> EditCart([FromBody] EditCartRequest request)
        {
            var tenantKey = User.FindFirst(JwtClaims.TenantKey)?.Value;
            if (string.IsNullOrEmpty(tenantKey))
                return Unauthorized("Tenant key not found in JWT.");

            try
            {
                await _adminService.EditCartAsync(request.SessionId, request.ItemId, request.Quantity, User, tenantKey);
                return Ok(new { message = "Cart updated successfully" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error editing cart");
                return StatusCode(500, "Error editing cart");
            }
        }

        // GET: api/admin/payment/{orderId}
        [HttpGet("payment/{orderId}")]
        public async Task<IActionResult> GetPaymentDetails(Guid orderId)
        {
            var tenantKey = User.FindFirst(JwtClaims.TenantKey)?.Value;
            if (string.IsNullOrEmpty(tenantKey))
                return Unauthorized("Tenant key not found in JWT.");

            try
            {
                var payment = await _adminService.GetPaymentDetailsAsync(orderId, User, tenantKey);
                return Ok(payment);
            }
            catch (ArgumentException ex)
            {
                return NotFound(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching payment details");
                return StatusCode(500, "Error fetching payment details");
            }
        }

        // ==================== SESSION MANAGEMENT ENDPOINTS ====================

        [HttpGet("sessions/active")]
        public async Task<IActionResult> GetActiveSessions()
        {
            var tenantKey = User.FindFirst(JwtClaims.TenantKey)?.Value;
            if (string.IsNullOrEmpty(tenantKey))
                return Unauthorized("Tenant key not found in JWT.");

            try
            {
                var sessions = await _dbContext.TableSessions
                    .Include(s => s.Table)
                    .Where(s => s.IsActive)
                    .OrderByDescending(s => s.StartedAt)
                    .Select(s => new
                    {
                        s.SessionId,
                        s.TableId,
                        TableNumber = s.Table != null ? s.Table.TableNumber : "Unknown",
                        s.StartedAt,
                        s.SessionCount,
                        ActiveMinutes = (int)(DateTime.UtcNow - s.StartedAt).TotalMinutes,
                        HasOrders = _dbContext.Orders.Any(o => o.SessionId == s.SessionId),
                        TotalOrders = _dbContext.Orders.Count(o => o.SessionId == s.SessionId),
                        UnpaidOrders = _dbContext.Orders.Count(o => o.SessionId == s.SessionId &&
                                                                   o.Status != OrderStatus.Closed),
                        PendingOrders = _dbContext.Orders.Count(o => o.SessionId == s.SessionId &&
                                                                    o.Status == OrderStatus.Pending),
                        PreparingOrders = _dbContext.Orders.Count(o => o.SessionId == s.SessionId &&
                                                                      o.Status == OrderStatus.Preparing),
                        ServedOrders = _dbContext.Orders.Count(o => o.SessionId == s.SessionId &&
                                                                  o.Status == OrderStatus.Served),
                        TotalAmount = _dbContext.Orders
                            .Where(o => o.SessionId == s.SessionId && o.Status != OrderStatus.Closed)
                            .Sum(o => (decimal?)o.TotalAmount) ?? 0,
                        CartItemCount = _dbContext.CartItems.Count(c => c.SessionId == s.SessionId)
                    })
                    .ToListAsync();

                _logger.LogInformation("Retrieved {Count} active sessions for tenant {TenantKey}",
                    sessions.Count, tenantKey);

                return Ok(sessions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching active sessions");
                return StatusCode(500, "Error fetching active sessions");
            }
        }

        [HttpPost("sessions/{sessionId}/close")]
        public async Task<IActionResult> CloseSession(Guid sessionId)
        {
            var tenantKey = User.FindFirst(JwtClaims.TenantKey)?.Value;
            if (string.IsNullOrEmpty(tenantKey))
                return Unauthorized("Tenant key not found in JWT.");

            try
            {
                var session = await _dbContext.TableSessions
                    .Include(s => s.Table)
                    .FirstOrDefaultAsync(s => s.SessionId == sessionId);

                if (session == null)
                {
                    _logger.LogWarning("Session {SessionId} not found", sessionId);
                    return NotFound(new { message = "Session not found" });
                }

                if (!session.IsActive)
                {
                    _logger.LogWarning("Attempt to close already inactive session {SessionId}", sessionId);
                    return BadRequest(new { message = "Session is already closed" });
                }

                // Check for unpaid orders
                var unpaidOrders = await _dbContext.Orders
                    .Where(o => o.SessionId == sessionId && o.Status != OrderStatus.Closed)
                    .ToListAsync();

                if (unpaidOrders.Any())
                {
                    _logger.LogWarning(
                        "Cannot close session {SessionId} with {Count} unpaid orders",
                        sessionId, unpaidOrders.Count);

                    return BadRequest(new
                    {
                        message = "Cannot close session with unpaid orders",
                        unpaidOrderCount = unpaidOrders.Count,
                        unpaidOrderIds = unpaidOrders.Select(o => o.OrderId),
                        totalUnpaidAmount = unpaidOrders.Sum(o => o.TotalAmount)
                    });
                }

                // Close session
                session.IsActive = false;
                session.EndedAt = DateTime.UtcNow;
                session.SessionCount = 0;

                // Free the table
                if (session.Table != null)
                {
                    session.Table.IsOccupied = false;
                    _dbContext.RestaurantTables.Update(session.Table);
                }

                // Clear cart items
                var cartItems = await _dbContext.CartItems
                    .Where(c => c.SessionId == sessionId)
                    .ToListAsync();

                if (cartItems.Any())
                {
                    _dbContext.CartItems.RemoveRange(cartItems);
                    _logger.LogInformation("Cleared {Count} cart items for session {SessionId}",
                        cartItems.Count, sessionId);
                }

                await _dbContext.SaveChangesAsync();

                _logger.LogInformation(
                    "Session {SessionId} manually closed by {User}. Table: {TableNumber}",
                    sessionId,
                    User.Identity?.Name,
                    session.Table?.TableNumber ?? "Unknown");

                return Ok(new
                {
                    message = "Session closed successfully",
                    sessionId = sessionId,
                    tableNumber = session.Table?.TableNumber,
                    closedBy = User.Identity?.Name,
                    closedAt = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error closing session {SessionId}", sessionId);
                return StatusCode(500, new { message = "Error closing session", error = ex.Message });
            }
        }

        [HttpGet("sessions/{sessionId}")]
        public async Task<IActionResult> GetSessionDetails(Guid sessionId)
        {
            var tenantKey = User.FindFirst(JwtClaims.TenantKey)?.Value;
            if (string.IsNullOrEmpty(tenantKey))
                return Unauthorized("Tenant key not found in JWT.");

            try
            {
                var session = await _dbContext.TableSessions
                    .Include(s => s.Table)
                    .FirstOrDefaultAsync(s => s.SessionId == sessionId);

                if (session == null)
                    return NotFound(new { message = "Session not found" });

                var orders = await _dbContext.Orders
                    .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.MenuItem)
                    .Where(o => o.SessionId == sessionId)
                    .Select(o => new
                    {
                        o.OrderId,
                        o.Status,
                        o.TotalAmount,
                        o.CreatedAt,
                        o.UpdatedAt,
                        Items = o.OrderItems.Select(oi => new
                        {
                            oi.OrderItemId,
                            oi.ItemId,
                            ItemName = oi.MenuItem != null ? oi.MenuItem.Name : "Unknown",
                            oi.Quantity,
                            oi.Price,
                            Subtotal = oi.Quantity * oi.Price
                        })
                    })
                    .ToListAsync();

                var cartItems = await _dbContext.CartItems
                    .Include(c => c.MenuItem)
                    .Where(c => c.SessionId == sessionId)
                    .Select(c => new
                    {
                        c.Id,
                        c.ItemId,
                        ItemName = c.MenuItem != null ? c.MenuItem.Name : "Unknown",
                        c.Quantity,
                        Price = c.MenuItem != null ? c.MenuItem.Price : 0,
                        Subtotal = c.Quantity * (c.MenuItem != null ? c.MenuItem.Price : 0),
                        c.AddedAt
                    })
                    .ToListAsync();

                var result = new
                {
                    session.SessionId,
                    session.TableId,
                    TableNumber = session.Table?.TableNumber ?? "Unknown",
                    session.IsActive,
                    session.StartedAt,
                    session.EndedAt,
                    session.SessionCount,
                    ActiveMinutes = session.IsActive
                        ? (int)(DateTime.UtcNow - session.StartedAt).TotalMinutes
                        : (int?)null,
                    Orders = orders,
                    TotalOrderCount = orders.Count,
                    TotalOrderAmount = orders.Sum(o => o.TotalAmount),
                    UnpaidOrderCount = orders.Count(o => o.Status != OrderStatus.Closed),
                    UnpaidAmount = orders.Where(o => o.Status != OrderStatus.Closed).Sum(o => o.TotalAmount),
                    CartItems = cartItems,
                    CartItemCount = cartItems.Count,
                    CartTotal = cartItems.Sum(c => c.Subtotal)
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching session details for {SessionId}", sessionId);
                return StatusCode(500, new { message = "Error fetching session details" });
            }
        }

        // Add new endpoint to AdminController.cs
        [HttpGet("order/{orderId}/preparing-items")]
        public async Task<IActionResult> GetPreparingItems(Guid orderId)
        {
            var tenantKey = User.FindFirst(JwtClaims.TenantKey)?.Value;
            if (string.IsNullOrEmpty(tenantKey))
                return Unauthorized("Tenant key not found in JWT.");

            try
            {
                var order = await _dbContext.Orders
                    .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.MenuItem)
                    .FirstOrDefaultAsync(o => o.OrderId == orderId && o.Status == OrderStatus.Preparing);

                if (order == null)
                    return Ok(new { preparingItemIds = new List<Guid>() });

                // Return item IDs that are being prepared (cannot be removed)
                var preparingItemIds = order.OrderItems.Select(oi => oi.ItemId).ToList();

                return Ok(new { preparingItemIds });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching preparing items for order {OrderId}", orderId);
                return StatusCode(500, "Error fetching preparing items");
            }
        }
    }

    public class UpdateOrderStatusRequest
    {
        public Guid OrderId { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class EditOrderRequest
    {
        public Guid OrderId { get; set; }
        public List<EditOrderItemRequest> Items { get; set; } = new();
    }

    public class EditOrderItemRequest
    {
        public Guid ItemId { get; set; }
        public int Quantity { get; set; }
    }

    public class EditCartRequest
    {
        public Guid SessionId { get; set; }
        public Guid ItemId { get; set; }
        public int Quantity { get; set; }
    }
}