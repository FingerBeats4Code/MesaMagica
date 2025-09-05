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
            if (string.IsNullOrEmpty(_tenantContext.Slug))
                return BadRequest("Tenant slug is missing.");

            try
            {
                var category = await _categoryService.CreateCategoryAsync(request, User, _tenantContext.Slug);
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
            if (string.IsNullOrEmpty(_tenantContext.Slug))
                return BadRequest("Tenant slug is missing.");

            try
            {
                var category = await _categoryService.UpdateCategoryAsync(id, request, User, _tenantContext.Slug);
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
            if (string.IsNullOrEmpty(_tenantContext.Slug))
                return BadRequest("Tenant slug is missing.");

            try
            {
                await _categoryService.DeleteCategoryAsync(id, User, _tenantContext.Slug);
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
            if (string.IsNullOrEmpty(_tenantContext.Slug))
                return BadRequest("Tenant slug is missing.");

            var categories = await _categoryService.GetCategoriesAsync(_tenantContext.Slug);
            return Ok(categories);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<CategoryResponse>> GetCategory(Guid id)
        {
            if (string.IsNullOrEmpty(_tenantContext.Slug))
                return BadRequest("Tenant slug is missing.");

            try
            {
                var category = await _categoryService.GetCategoryAsync(id, _tenantContext.Slug);
                return Ok(category);
            }
            catch (ArgumentException ex)
            {
                return NotFound(ex.Message);
            }
        }
    }
}