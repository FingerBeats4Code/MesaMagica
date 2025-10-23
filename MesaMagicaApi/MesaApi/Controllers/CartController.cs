using MesaApi.Common;
using MesaApi.Multitenancy;
using MesaMagicaApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;

namespace MesaMagicaApi.Controllers
{
    [Route("api/cart")]
    [ApiController]
    [Authorize]
    public class CartController : ControllerBase
    {
        private readonly ICartService _cartService;
        private readonly ITenantContext _tenantContext;

        public CartController(ICartService cartService, ITenantContext tenantContext)
        {
            _cartService = cartService;
            _tenantContext = tenantContext;
        }

        [HttpGet]
        public async Task<IActionResult> GetCart(Guid sessionId)
        {
            var cart = await _cartService.GetCartAsync(sessionId);
            return Ok(cart);
        }

        //------------------changes for supporting both increment and decrement via quantity parameter----------------------
        [HttpPost("add")]
        public async Task<IActionResult> AddToCart([FromBody] AddToCartRequest request)
        {
            // Positive quantity: Add/Increment items
            // Negative quantity: Remove/Decrement items
            // Zero is not allowed
            if (request.Quantity == 0)
                return BadRequest("Quantity cannot be zero. Use positive to add, negative to remove.");

            await _cartService.AddToCartAsync(request.SessionId, request.ItemId, request.Quantity);

            var message = request.Quantity > 0
                ? "Item added to cart successfully"
                : "Item quantity decreased successfully";

            return Ok(new { message });
        }
        //------------------end changes----------------------

        //------------------changes for explicit remove endpoint----------------------
        [HttpDelete("remove")]
        public async Task<IActionResult> RemoveFromCart([FromBody] RemoveFromCartRequest request)
        {
            await _cartService.RemoveFromCartAsync(request.SessionId, request.ItemId);
            return Ok(new { message = "Item removed from cart successfully" });
        }
        //------------------end changes----------------------

        //------------------changes for adding clear cart endpoint----------------------
        [HttpDelete("clear")]
        public async Task<IActionResult> ClearCart([FromQuery] Guid sessionId)
        {
            await _cartService.ClearCartAsync(sessionId);
            return Ok(new { message = "Cart cleared successfully" });
        }
        //------------------end changes----------------------

        [HttpPost("submit")]
        public async Task<IActionResult> SubmitOrder([FromBody] SubmitOrderRequest request)
        {
            var tenantKey = _tenantContext.TenantKey;
            if (string.IsNullOrEmpty(tenantKey))
                return BadRequest("Tenant key is missing.");

            var orderResponse = await _cartService.SubmitOrderAsync(request.SessionId, request.TableId, tenantKey, User);
            return Ok(orderResponse);
        }
    }

    public class AddToCartRequest
    {
        [Required]
        public Guid SessionId { get; set; }

        [Required]
        public Guid ItemId { get; set; }

        //------------------changes for allowing negative quantities for decrement----------------------
        [Range(-100, 100, ErrorMessage = "Quantity must be between -100 and 100, but cannot be 0")]
        public int Quantity { get; set; } = 1;
        //------------------end changes----------------------
    }

    public class RemoveFromCartRequest
    {
        [Required]
        public Guid SessionId { get; set; }

        [Required]
        public Guid ItemId { get; set; }
    }

    public class SubmitOrderRequest
    {
        [Required]
        public Guid SessionId { get; set; }

        [Required]
        [StringLength(50)]
        public string TableId { get; set; } = string.Empty;
    }
}