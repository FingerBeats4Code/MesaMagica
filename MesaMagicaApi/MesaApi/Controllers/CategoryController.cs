using MesaApi.Models;
using MesaApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MesaApi.Multitenancy;

namespace MesaApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CategoriesController : ControllerBase
    {
        private readonly ICategoryService _categoryService;
        private readonly ITenantContext _tenantContext;

        public CategoriesController(ICategoryService categoryService, ITenantContext tenantContext)
        {
            _categoryService = categoryService ?? throw new ArgumentNullException(nameof(categoryService));
            _tenantContext = tenantContext ?? throw new ArgumentNullException(nameof(tenantContext));
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<CategoryResponse>> CreateCategory([FromBody] CreateCategoryRequest request)
        {
            //-----------------------------changes for tenant validation-----------------
            // Removed manual slug check since TenantResolutionMiddleware will now set TenantKey
            var tenantKey = _tenantContext.TenantKey;
            if (string.IsNullOrEmpty(tenantKey))
                return BadRequest("Tenant key is missing.");
            //----------------------------------------------------------------------------

            try
            {
                var category = await _categoryService.CreateCategoryAsync(request, User, tenantKey);
                return CreatedAtAction(nameof(GetCategory), new { id = category.CategoryId }, category);
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

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<CategoryResponse>> UpdateCategory(Guid id, [FromBody] UpdateCategoryRequest request)
        {
            //-----------------------------changes for tenant validation-----------------
            var tenantKey = _tenantContext.TenantKey;
            if (string.IsNullOrEmpty(tenantKey))
                return BadRequest("Tenant key is missing.");
            //----------------------------------------------------------------------------

            try
            {
                var category = await _categoryService.UpdateCategoryAsync(id, request, User, tenantKey);
                return Ok(category);
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

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteCategory(Guid id)
        {
            //-----------------------------changes for tenant validation-----------------
            var tenantKey = _tenantContext.TenantKey;
            if (string.IsNullOrEmpty(tenantKey))
                return BadRequest("Tenant key is missing.");
            //----------------------------------------------------------------------------

            try
            {
                await _categoryService.DeleteCategoryAsync(id, User, tenantKey);
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

        [HttpGet]
        public async Task<ActionResult<List<CategoryResponse>>> GetCategories()
        {
            //-----------------------------changes for tenant validation-----------------
            var tenantKey = _tenantContext.TenantKey;
            if (string.IsNullOrEmpty(tenantKey))
                return BadRequest("Tenant key is missing.");
            //----------------------------------------------------------------------------

            var categories = await _categoryService.GetCategoriesAsync(tenantKey);
            return Ok(categories);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<CategoryResponse>> GetCategory(Guid id)
        {
            //-----------------------------changes for tenant validation-----------------
            var tenantKey = _tenantContext.TenantKey;
            if (string.IsNullOrEmpty(tenantKey))
                return BadRequest("Tenant key is missing.");
            //----------------------------------------------------------------------------

            try
            {
                var category = await _categoryService.GetCategoryAsync(id, tenantKey);
                return Ok(category);
            }
            catch (ArgumentException ex)
            {
                return NotFound(ex.Message);
            }
        }
    }
}
