using MesaApi.Models;
using MesaApi.Multitenancy;
using MesaMagica.Api.Data;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace MesaApi.Services
{
    public class CategoryService : ICategoryService
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly ITenantContext _tenantContext;
        private readonly ILogger<CategoryService> _logger;

        public CategoryService(ApplicationDbContext dbContext, ITenantContext tenantContext, ILogger<CategoryService> logger)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _tenantContext = tenantContext ?? throw new ArgumentNullException(nameof(tenantContext));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        private async Task ValidateAdminUserAsync(ClaimsPrincipal user, string tenantSlug)
        {
            if (!user.IsInRole("Admin"))
                throw new UnauthorizedAccessException("User is not authorized to perform this action.");

            var userIdClaim = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
                throw new UnauthorizedAccessException("Invalid user ID in token.");

            var dbUser = await _dbContext.Users
                .FirstOrDefaultAsync(u => u.UserId == userId && u.Role == "Admin" && u.IsActive);
            if (dbUser == null)
                throw new UnauthorizedAccessException("User is not an active admin in the database.");

            var userTenantSlug = user.FindFirst("tenantSlug")?.Value;
            if (string.IsNullOrEmpty(userTenantSlug) || userTenantSlug != tenantSlug)
                throw new UnauthorizedAccessException("Tenant mismatch in request.");
        }

        public async Task<CategoryResponse> CreateCategoryAsync(CreateCategoryRequest request, ClaimsPrincipal user, string tenantSlug)
        {
            if (string.IsNullOrEmpty(tenantSlug))
                throw new ArgumentException("Tenant slug is missing.");

            await ValidateAdminUserAsync(user, tenantSlug);

            if (string.IsNullOrEmpty(request.Name))
                throw new ArgumentException("Category name is required.");

            var existingCategory = await _dbContext.Categories
                .FirstOrDefaultAsync(c => c.Name == request.Name);
            if (existingCategory != null)
                throw new ArgumentException("Category with this name already exists.");

            var category = new Category
            {
                CategoryId = Guid.NewGuid(),
                Name = request.Name,
                IsActive = request.IsActive
            };

            _dbContext.Categories.Add(category);
            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("Category created. CategoryId: {CategoryId}, Name: {Name}, TenantSlug: {TenantSlug}",
                category.CategoryId, category.Name, tenantSlug);

            return new CategoryResponse
            {
                CategoryId = category.CategoryId,
                Name = category.Name,
                IsActive = category.IsActive
            };
        }

        public async Task<CategoryResponse> UpdateCategoryAsync(Guid categoryId, UpdateCategoryRequest request, ClaimsPrincipal user, string tenantSlug)
        {
            if (string.IsNullOrEmpty(tenantSlug))
                throw new ArgumentException("Tenant slug is missing.");

            await ValidateAdminUserAsync(user, tenantSlug);

            if (string.IsNullOrEmpty(request.Name))
                throw new ArgumentException("Category name is required.");

            var category = await _dbContext.Categories
                .FirstOrDefaultAsync(c => c.CategoryId == categoryId);
            if (category == null)
                throw new ArgumentException("Category not found.");

            var existingCategory = await _dbContext.Categories
                .FirstOrDefaultAsync(c => c.Name == request.Name && c.CategoryId != categoryId);
            if (existingCategory != null)
                throw new ArgumentException("Category with this name already exists.");

            category.Name = request.Name;
            category.IsActive = request.IsActive;
            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("Category updated. CategoryId: {CategoryId}, Name: {Name}, TenantSlug: {TenantSlug}",
                category.CategoryId, category.Name, tenantSlug);

            return new CategoryResponse
            {
                CategoryId = category.CategoryId,
                Name = category.Name,
                IsActive = category.IsActive
            };
        }

        public async Task DeleteCategoryAsync(Guid categoryId, ClaimsPrincipal user, string tenantSlug)
        {
            if (string.IsNullOrEmpty(tenantSlug))
                throw new ArgumentException("Tenant slug is missing.");

            await ValidateAdminUserAsync(user, tenantSlug);

            var category = await _dbContext.Categories
                .FirstOrDefaultAsync(c => c.CategoryId == categoryId);
            if (category == null)
                throw new ArgumentException("Category not found.");

            var hasMenuItems = await _dbContext.MenuItems
                .AnyAsync(m => m.CategoryId == categoryId);
            if (hasMenuItems)
                throw new ArgumentException("Cannot delete category with associated menu items.");

            _dbContext.Categories.Remove(category);
            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("Category deleted. CategoryId: {CategoryId}, TenantSlug: {TenantSlug}",
                categoryId, tenantSlug);
        }

        public async Task<List<CategoryResponse>> GetCategoriesAsync(string tenantSlug)
        {
            if (string.IsNullOrEmpty(tenantSlug))
                throw new ArgumentException("Tenant slug is missing.");

            var categories = await _dbContext.Categories
                .Where(c => c.IsActive)
                .Select(c => new CategoryResponse
                {
                    CategoryId = c.CategoryId,
                    Name = c.Name,
                    IsActive = c.IsActive
                })
                .ToListAsync();

            return categories;
        }

        public async Task<CategoryResponse> GetCategoryAsync(Guid categoryId, string tenantSlug)
        {
            if (string.IsNullOrEmpty(tenantSlug))
                throw new ArgumentException("Tenant slug is missing.");

            var category = await _dbContext.Categories
                .FirstOrDefaultAsync(c => c.CategoryId == categoryId);
            if (category == null)
                throw new ArgumentException("Category not found.");

            return new CategoryResponse
            {
                CategoryId = category.CategoryId,
                Name = category.Name,
                IsActive = category.IsActive
            };
        }
    }
}