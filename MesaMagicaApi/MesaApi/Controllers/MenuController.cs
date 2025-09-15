using MesaApi.Models;
using MesaApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MesaApi.Multitenancy;

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

        [HttpPost("items")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<MenuItemResponse>> CreateMenuItem([FromBody] CreateMenuItemRequest request)
        {
            if (string.IsNullOrEmpty(_tenantContext.Slug))
                return BadRequest("Tenant slug is missing.");

            try
            {
                var menuItem = await _menuService.CreateMenuItemAsync(request, User, _tenantContext.Slug);
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
            if (string.IsNullOrEmpty(_tenantContext.Slug))
                return BadRequest("Tenant slug is missing.");

            try
            {
                var menuItem = await _menuService.UpdateMenuItemAsync(id, request, User, _tenantContext.Slug);
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
            if (string.IsNullOrEmpty(_tenantContext.Slug))
                return BadRequest("Tenant slug is missing.");

            try
            {
                await _menuService.DeleteMenuItemAsync(id, User, _tenantContext.Slug);
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

        [HttpGet("items")]
        public async Task<ActionResult<List<MenuItemResponse>>> GetMenuItems()
        {
            if (string.IsNullOrEmpty(_tenantContext.Slug))
                return BadRequest("Tenant slug is missing.");

            var menuItems = await _menuService.GetMenuItemsAsync(_tenantContext.Slug);
            return Ok(menuItems);
        }

        [HttpGet("items/{id}")]
        public async Task<ActionResult<MenuItemResponse>> GetMenuItem(Guid id)
        {
            if (string.IsNullOrEmpty(_tenantContext.Slug))
                return BadRequest("Tenant slug is missing.");

            try
            {
                var menuItem = await _menuService.GetMenuItemAsync(id, _tenantContext.Slug);
                return Ok(menuItem);
            }
            catch (ArgumentException ex)
            {
                return NotFound(ex.Message);
            }
        }
    }
}