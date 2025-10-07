using MesaApi.Models;
using MesaApi.Multitenancy;
using MesaApi.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
[ApiController]
[Route("api/orders")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly IOrderService _orderService;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<OrdersController> _logger;

    public OrdersController(IOrderService orderService, ITenantContext tenantContext, ILogger<OrdersController> logger)
    {
        _orderService = orderService;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest request)
    {
        var tenantKey = _tenantContext.TenantKey;
        if (string.IsNullOrEmpty(tenantKey))
            return BadRequest("Tenant key is missing.");

        var response = await _orderService.CreateOrderAsync(request, User, tenantKey);
        return CreatedAtAction(nameof(GetOrder), new { id = response.OrderId }, response);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetOrder(Guid id)
    {
        var tenantKey = _tenantContext.TenantKey;
        if (string.IsNullOrEmpty(tenantKey))
            return BadRequest("Tenant key is missing.");

        var response = await _orderService.GetOrderAsync(id, User, tenantKey);
        return Ok(response);
    }

    [HttpGet("/api/sessions/{sessionId}/orders")]
    public async Task<IActionResult> GetOrdersBySession(Guid sessionId)
    {
        var tenantKey = _tenantContext.TenantKey;
        if (string.IsNullOrEmpty(tenantKey))
            return BadRequest("Tenant key is missing.");

        var response = await _orderService.GetOrdersBySessionAsync(sessionId, User, tenantKey);
        return Ok(response);
    }

    [HttpPut("{id}/items")]
    public async Task<IActionResult> UpdateOrderItems(Guid id, [FromBody] UpdateOrderItemsRequest request)
    {
        var tenantKey = _tenantContext.TenantKey;
        if (string.IsNullOrEmpty(tenantKey))
            return BadRequest("Tenant key is missing.");

        var response = await _orderService.UpdateOrderItemsAsync(id, request, User, tenantKey);
        return Ok(response);
    }
}
