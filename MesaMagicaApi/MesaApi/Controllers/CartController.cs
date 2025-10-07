using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MesaMagicaApi.Services;
using MesaApi.Multitenancy;

namespace MesaMagicaApi.Controllers
{
    [Route("api/cart")]
    [ApiController]
    [Authorize] // Require JWT
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
            //-----------------------------changes for tenant validation-----------------
            // Use tenantKey from TenantContext (resolved from subdomain + validated in JWT)
            var tenantKey = _tenantContext.TenantKey;
            if (string.IsNullOrEmpty(tenantKey))
                return BadRequest("Tenant key is missing.");
            //----------------------------------------------------------------------------

            var orderResponse = await _cartService.SubmitOrderAsync(request.SessionId, request.TableId, tenantKey, User);
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

        //-----------------------------changes for reason-----------------
        // Removed TenantSlug from request because tenant is now in JWT + TenantContext
        //----------------------------------------------------------------
    }
}
