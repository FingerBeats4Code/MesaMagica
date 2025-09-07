using MesaApi.Models;
using MesaApi.Multitenancy;
using MesaApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;
using System.Security.Claims;

namespace MesaApi.Controllers
{
    [ApiController]
    [Route("api/orders")]
    public class OrdersController : ControllerBase
    {
        private readonly IOrderService _orderService;
        private readonly ITenantContext _tenantContext;
        private readonly ILogger<OrdersController> _logger;

        public OrdersController(IOrderService orderService, ITenantContext tenantContext, ILogger<OrdersController> logger)
        {
            _orderService = orderService ?? throw new ArgumentNullException(nameof(orderService));
            _tenantContext = tenantContext ?? throw new ArgumentNullException(nameof(tenantContext));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        [HttpPost]
        [Authorize]
        [SwaggerOperation(Summary = "Creates an order for a session", Description = "Creates an order for the authenticated user's session. Requires JWT with sessionId, tenantSlug, and tableId claims.")]
        [SwaggerResponse(201, "Order created successfully", typeof(OrderResponse))]
        [SwaggerResponse(400, "Invalid request or session")]
        [SwaggerResponse(401, "Unauthorized or invalid session")]
        public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest request)
        {
            if (string.IsNullOrEmpty(_tenantContext.Slug))
            {
                _logger.LogWarning("CreateOrder failed: TenantSlug is missing.");
                return BadRequest("Tenant slug is missing.");
            }

            try
            {
                var response = await _orderService.CreateOrderAsync(request, User, _tenantContext.Slug);
                return CreatedAtAction(nameof(GetOrder), new { id = response.OrderId }, response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "CreateOrder failed: {Message}, TenantSlug: {TenantSlug}", ex.Message, _tenantContext.Slug);
                return BadRequest(ex.Message);
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning(ex, "CreateOrder unauthorized: {Message}, TenantSlug: {TenantSlug}", ex.Message, _tenantContext.Slug);
                return Unauthorized(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in CreateOrder for TenantSlug: {TenantSlug}", _tenantContext.Slug);
                return StatusCode(500, "An unexpected error occurred.");
            }
        }

        [HttpGet("{id}")]
        [Authorize]
        [SwaggerOperation(Summary = "Gets an order by ID", Description = "Retrieves an order by ID. Customers can view their own orders, admins can view any order.")]
        [SwaggerResponse(200, "Order retrieved successfully", typeof(OrderResponse))]
        [SwaggerResponse(400, "Tenant slug is missing")]
        [SwaggerResponse(401, "Unauthorized or invalid session")]
        [SwaggerResponse(404, "Order not found")]
        public async Task<IActionResult> GetOrder(Guid id)
        {
            if (string.IsNullOrEmpty(_tenantContext.Slug))
            {
                _logger.LogWarning("GetOrder failed: TenantSlug is missing.");
                return BadRequest("Tenant slug is missing.");
            }

            try
            {
                var response = await _orderService.GetOrderAsync(id, User, _tenantContext.Slug);
                return Ok(response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "GetOrder failed for OrderId: {OrderId}, TenantSlug: {TenantSlug}", id, _tenantContext.Slug);
                return NotFound(ex.Message);
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning(ex, "GetOrder unauthorized for OrderId: {OrderId}, TenantSlug: {TenantSlug}", id, _tenantContext.Slug);
                return Unauthorized(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in GetOrder for OrderId: {OrderId}, TenantSlug: {TenantSlug}", id, _tenantContext.Slug);
                return StatusCode(500, "An unexpected error occurred.");
            }
        }

        [HttpGet("/api/sessions/{sessionId}/orders")]
        [Authorize]
        [SwaggerOperation(Summary = "Gets all orders for a session", Description = "Retrieves all orders for a session. Customers can view their own session's orders, admins can view any session's orders.")]
        [SwaggerResponse(200, "Orders retrieved successfully", typeof(List<OrderResponse>))]
        [SwaggerResponse(400, "Tenant slug is missing")]
        [SwaggerResponse(401, "Unauthorized or invalid session")]
        public async Task<IActionResult> GetOrdersBySession(Guid sessionId)
        {
            if (string.IsNullOrEmpty(_tenantContext.Slug))
            {
                _logger.LogWarning("GetOrdersBySession failed: TenantSlug is missing.");
                return BadRequest("Tenant slug is missing.");
            }

            try
            {
                var response = await _orderService.GetOrdersBySessionAsync(sessionId, User, _tenantContext.Slug);
                return Ok(response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "GetOrdersBySession failed for SessionId: {SessionId}, TenantSlug: {TenantSlug}", sessionId, _tenantContext.Slug);
                return BadRequest(ex.Message);
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning(ex, "GetOrdersBySession unauthorized for SessionId: {SessionId}, TenantSlug: {TenantSlug}", sessionId, _tenantContext.Slug);
                return Unauthorized(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in GetOrdersBySession for SessionId: {SessionId}, TenantSlug: {TenantSlug}", sessionId, _tenantContext.Slug);
                return StatusCode(500, "An unexpected error occurred.");
            }
        }

        [HttpPut("{id}/items")]
        [Authorize]
        [SwaggerOperation(Summary = "Updates items in an order", Description = "Updates items in an existing order. Customers can update their own orders, admins can update any order. Order must not be settled.")]
        [SwaggerResponse(200, "Order updated successfully", typeof(OrderResponse))]
        [SwaggerResponse(400, "Invalid request or order not pending")]
        [SwaggerResponse(401, "Unauthorized or invalid session")]
        [SwaggerResponse(404, "Order not found")]
        public async Task<IActionResult> UpdateOrderItems(Guid id, [FromBody] UpdateOrderItemsRequest request)
        {
            if (string.IsNullOrEmpty(_tenantContext.Slug))
            {
                _logger.LogWarning("UpdateOrderItems failed: TenantSlug is missing.");
                return BadRequest("Tenant slug is missing.");
            }

            try
            {
                var response = await _orderService.UpdateOrderItemsAsync(id, request, User, _tenantContext.Slug);
                return Ok(response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "UpdateOrderItems failed for OrderId: {OrderId}, TenantSlug: {TenantSlug}", id, _tenantContext.Slug);
                return BadRequest(ex.Message);
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning(ex, "UpdateOrderItems unauthorized for OrderId: {OrderId}, TenantSlug: {TenantSlug}", id, _tenantContext.Slug);
                return Unauthorized(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in UpdateOrderItems for OrderId: {OrderId}, TenantSlug: {TenantSlug}", id, _tenantContext.Slug);
                return StatusCode(500, "An unexpected error occurred.");
            }
        }
    }
}