using MesaApi.Common;
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
            //------------------changes for consistent tenant validation from JWT only----------------------
            var tenantKey = User.FindFirst(JwtClaims.TenantKey)?.Value;
            if (tenantKey == null) return Unauthorized("Tenant not found in JWT.");

            try
            {
                var menuItem = await _menuService.CreateMenuItemAsync(request, User, tenantKey);
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
            //------------------end changes----------------------
        }

        [HttpPut("items/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<MenuItemResponse>> UpdateMenuItem(Guid id, [FromBody] UpdateMenuItemRequest request)
        {
            //------------------changes for consistent tenant validation from JWT only----------------------
            var tenantKey = User.FindFirst(JwtClaims.TenantKey)?.Value;
            if (tenantKey == null) return Unauthorized("Tenant not found in JWT.");

            try
            {
                var menuItem = await _menuService.UpdateMenuItemAsync(id, request, User, tenantKey);
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
            //------------------end changes----------------------
        }

        [HttpDelete("items/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteMenuItem(Guid id)
        {
            //------------------changes for consistent tenant validation from JWT only----------------------
            var tenantKey = User.FindFirst(JwtClaims.TenantKey)?.Value;
            if (tenantKey == null) return Unauthorized("Tenant not found in JWT.");

            try
            {
                await _menuService.DeleteMenuItemAsync(id, User, tenantKey);
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
            //------------------end changes----------------------
        }

        // ---------------- Session APIs ----------------

        [HttpGet("items")]
        [Authorize]
        public async Task<ActionResult<List<MenuItemResponse>>> GetMenuItems()
        {
            //------------------changes for consistent tenant validation from JWT only----------------------
            var tenantKey = User.FindFirst(JwtClaims.TenantKey)?.Value;
            if (tenantKey == null) return Unauthorized("Tenant not found in JWT.");

            var menuItems = await _menuService.GetMenuItemsAsync(tenantKey);
            return Ok(menuItems);
            //------------------end changes----------------------
        }

        [HttpGet("items/{id}")]
        [Authorize]
        public async Task<ActionResult<MenuItemResponse>> GetMenuItem(Guid id)
        {
            //------------------changes for consistent tenant validation from JWT only----------------------
            var tenantKey = User.FindFirst(JwtClaims.TenantKey)?.Value;
            if (tenantKey == null) return Unauthorized("Tenant not found in JWT.");

            try
            {
                var menuItem = await _menuService.GetMenuItemAsync(id, tenantKey);
                return Ok(menuItem);
            }
            catch (ArgumentException ex)
            {
                return NotFound(ex.Message);
            }
            //------------------end changes----------------------
        }

        [HttpGet("categories/{categoryId}/items")]
        [Authorize]
        public async Task<ActionResult<List<MenuItemResponse>>> GetMenuItemsByCategory(Guid categoryId)
        {
            var tenantKey = User.FindFirst(JwtClaims.TenantKey)?.Value;
            if (tenantKey == null) return Unauthorized("Tenant not found in JWT.");

            try
            {
                var menuItems = await _menuService.GetMenuItemsByCategoryAsync(categoryId, tenantKey);
                return Ok(menuItems);
            }
            catch (ArgumentException ex)
            {
                return NotFound(ex.Message);
            }
        }
        //------------------end changes----------------------
    }
}