// MesaMagicaApi/MesaApi/Controllers/AdminController.cs
using MesaApi.Common;
using MesaApi.Models;
using MesaApi.Multitenancy;
using MesaApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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

        public AdminController(
            IAdminService adminService,
            ITenantContext tenantContext,
            ILogger<AdminController> logger)
        {
            _adminService = adminService;
            _tenantContext = tenantContext;
            _logger = logger;
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
    }

    // Request/Response Models
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