using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MesaMagicaApi.Services;

namespace MesaMagicaApi.Controllers
{
    [Route("api/cart")]
    [ApiController]
    [Authorize] // Require JWT
    public class CartController : ControllerBase
    {
        private readonly ICartService _cartService;

        public CartController(ICartService cartService)
        {
            _cartService = cartService;
        }

        [HttpGet]
        public async Task<IActionResult> GetCart(Guid sessionId)
        {
            var cart = await _cartService.GetCartAsync(sessionId);
            return Ok(cart);
        }

        [HttpPost("add")]
        public async Task<IActionResult> AddToCart([FromBody] AddToCartRequest request)
        {
            await _cartService.AddToCartAsync(request.SessionId, request.ItemId, request.Quantity);
            return Ok();
        }

        [HttpPost("remove")]
        public async Task<IActionResult> RemoveFromCart([FromBody] RemoveFromCartRequest request)
        {
            await _cartService.RemoveFromCartAsync(request.SessionId, request.ItemId);
            return Ok();
        }

        [HttpPost("submit")]
        public async Task<IActionResult> SubmitOrder([FromBody] SubmitOrderRequest request)
        {
            var orderResponse = await _cartService.SubmitOrderAsync(request.SessionId, request.TableId, request.TenantSlug, User);
            return Ok(orderResponse);
        }
    }

    public class AddToCartRequest
    {
        public Guid SessionId { get; set; }
        public Guid ItemId { get; set; }
        public int Quantity { get; set; } = 1;
    }

    public class RemoveFromCartRequest
    {
        public Guid SessionId { get; set; }
        public Guid ItemId { get; set; }
    }

     public class SubmitOrderRequest
    {
        public Guid SessionId { get; set; }
        public string TableId { get; set; } = string.Empty;
        public string TenantSlug { get; set; } = string.Empty;
    }
}