using MesaApi.Models;
using MesaApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MesaApi.Multitenancy;
using System.Security.Claims;

namespace MesaApi.Controllers
{
    [Route("api/menu")]
    [ApiController]
    public class MenuController : ControllerBase
    {
        private readonly IMenuService _menuService;
        private readonly ITenantContext _tenantContext;

        public MenuController(IMenuService menuService, ITenantContext tenantContext)
        {
            _menuService = menuService ?? throw new ArgumentNullException(nameof(menuService));
            _tenantContext = tenantContext ?? throw new ArgumentNullException(nameof(tenantContext));
        }

        // ---------------- Admin APIs ----------------

        [HttpPost("items")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<MenuItemResponse>> CreateMenuItem([FromBody] CreateMenuItemRequest request)
        {
            //---------------- change: tenant comes from JWT claim ----------------
            var tenantId = User.FindFirst("tenantId")?.Value;
            if (tenantId == null) return Unauthorized("Tenant not found in JWT.");

            try
            {
                var menuItem = await _menuService.CreateMenuItemAsync(request, User, tenantId);
                return CreatedAtAction(nameof(GetMenuItem), new { id = menuItem.ItemId }, menuItem);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(ex.Message);
            }
        }

        [HttpPut("items/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<MenuItemResponse>> UpdateMenuItem(Guid id, [FromBody] UpdateMenuItemRequest request)
        {
            var tenantId = User.FindFirst("tenantId")?.Value;
            if (tenantId == null) return Unauthorized("Tenant not found in JWT.");

            try
            {
                var menuItem = await _menuService.UpdateMenuItemAsync(id, request, User, tenantId);
                return Ok(menuItem);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(ex.Message);
            }
        }

        [HttpDelete("items/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteMenuItem(Guid id)
        {
            var tenantId = User.FindFirst("tenantId")?.Value;
            if (tenantId == null) return Unauthorized("Tenant not found in JWT.");

            try
            {
                await _menuService.DeleteMenuItemAsync(id, User, tenantId);
                return NoContent();
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(ex.Message);
            }
        }

        // ---------------- Session APIs ----------------

        [HttpGet("items")]
        [Authorize] // any valid token: session or admin
        public async Task<ActionResult<List<MenuItemResponse>>> GetMenuItems()
        {
            //---------------- change: tenant comes from JWT claim ----------------
            var tenantId = User.FindFirst("tenantKey")?.Value;
            if (tenantId == null) return Unauthorized("Tenant not found in JWT.");

            var menuItems = await _menuService.GetMenuItemsAsync(tenantId);
            return Ok(menuItems);
        }

        [HttpGet("items/{id}")]
        [Authorize] // any valid token
        public async Task<ActionResult<MenuItemResponse>> GetMenuItem(Guid id)
        {
            var tenantId = User.FindFirst("tenantId")?.Value;
            if (tenantId == null) return Unauthorized("Tenant not found in JWT.");

            try
            {
                var menuItem = await _menuService.GetMenuItemAsync(id, tenantId);
                return Ok(menuItem);
            }
            catch (ArgumentException ex)
            {
                return NotFound(ex.Message);
            }
        }
    }
}
