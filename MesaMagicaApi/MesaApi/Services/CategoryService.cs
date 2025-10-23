using MesaApi.Common;
using MesaApi.Models;
using MesaApi.Multitenancy;
using MesaMagica.Api.Data;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace MesaApi.Services
{
    //------------------changes for using base service and consistent tenant validation----------------------
    public class CategoryService : TenantAwareService, ICategoryService
    {
        public CategoryService(
            ApplicationDbContext dbContext,
            ITenantContext tenantContext,
            ILogger<CategoryService> logger)
            : base(dbContext, tenantContext, logger)
        {
        }

        public async Task<CategoryResponse> CreateCategoryAsync(CreateCategoryRequest request, ClaimsPrincipal user, string tenantKey)
        {
            if (string.IsNullOrEmpty(tenantKey))
                throw new ArgumentException("Tenant key is missing.");

            await ValidateAdminAndGetUserIdAsync(user, tenantKey);

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
                Description = request.Description,
                IsActive = request.IsActive
            };

            _dbContext.Categories.Add(category);
            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("Category created. CategoryId: {CategoryId}, Name: {Name}, TenantKey: {TenantKey}",
                category.CategoryId, category.Name, tenantKey);

            return new CategoryResponse
            {
                CategoryId = category.CategoryId,
                Name = category.Name,
                Description = category.Description,
                IsActive = category.IsActive
            };
        }

        public async Task<CategoryResponse> UpdateCategoryAsync(Guid categoryId, UpdateCategoryRequest request, ClaimsPrincipal user, string tenantKey)
        {
            if (string.IsNullOrEmpty(tenantKey))
                throw new ArgumentException("Tenant key is missing.");

            await ValidateAdminAndGetUserIdAsync(user, tenantKey);

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
            category.Description = request.Description;
            category.IsActive = request.IsActive;
            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("Category updated. CategoryId: {CategoryId}, Name: {Name}, TenantKey: {TenantKey}",
                category.CategoryId, category.Name, tenantKey);

            return new CategoryResponse
            {
                CategoryId = category.CategoryId,
                Name = category.Name,
                Description = category.Description,
                IsActive = category.IsActive
            };
        }

        public async Task DeleteCategoryAsync(Guid categoryId, ClaimsPrincipal user, string tenantKey)
        {
            if (string.IsNullOrEmpty(tenantKey))
                throw new ArgumentException("Tenant key is missing.");

            await ValidateAdminAndGetUserIdAsync(user, tenantKey);

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

            _logger.LogInformation("Category deleted. CategoryId: {CategoryId}, TenantKey: {TenantKey}",
                categoryId, tenantKey);
        }

        public async Task<List<CategoryResponse>> GetCategoriesAsync(string tenantKey)
        {
            if (string.IsNullOrEmpty(tenantKey))
                throw new ArgumentException("Tenant key is missing.");

            var categories = await _dbContext.Categories
                .Where(c => c.IsActive)
                .Select(c => new CategoryResponse
                {
                    CategoryId = c.CategoryId,
                    Name = c.Name,
                    Description = c.Description,
                    IsActive = c.IsActive
                })
                .ToListAsync();

            return categories;
        }

        public async Task<CategoryResponse> GetCategoryAsync(Guid categoryId, string tenantKey)
        {
            if (string.IsNullOrEmpty(tenantKey))
                throw new ArgumentException("Tenant key is missing.");

            var category = await _dbContext.Categories
                .FirstOrDefaultAsync(c => c.CategoryId == categoryId);
            if (category == null)
                throw new ArgumentException("Category not found.");

            return new CategoryResponse
            {
                CategoryId = category.CategoryId,
                Name = category.Name,
                Description = category.Description,
                IsActive = category.IsActive
            };
        }
    }
    //------------------end changes----------------------
}