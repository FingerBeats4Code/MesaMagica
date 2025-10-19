using MesaApi.Common;
using MesaApi.Models;
using MesaApi.Multitenancy;
using MesaMagica.Api.Data;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace MesaApi.Services
{
    //------------------changes for using base service and consistent tenant validation----------------------
    public class MenuService : TenantAwareService, IMenuService
    {
        public MenuService(
            ApplicationDbContext dbContext,
            ITenantContext tenantContext,
            ILogger<MenuService> logger)
            : base(dbContext, tenantContext, logger)
        {
        }

        public async Task<MenuItemResponse> CreateMenuItemAsync(CreateMenuItemRequest request, ClaimsPrincipal user, string tenantKey)
        {
            if (string.IsNullOrEmpty(tenantKey))
                throw new ArgumentException("Tenant key is missing.");

            var userId = await ValidateAdminAndGetUserIdAsync(user, tenantKey);

            if (string.IsNullOrEmpty(request.Name))
                throw new ArgumentException("Menu item name is required.");

            var category = await _dbContext.Categories
                .FirstOrDefaultAsync(c => c.CategoryId == request.CategoryId && c.IsActive);
            if (category == null)
                throw new ArgumentException("Category not found or inactive.");

            var menuItem = new MenuItem
            {
                ItemId = Guid.NewGuid(),
                Name = request.Name,
                Description = request.Description,
                Price = request.Price,
                CategoryId = request.CategoryId,
                IsAvailable = request.IsAvailable,
                ImageUrl = request.ImageUrl
            };

            _dbContext.MenuItems.Add(menuItem);
            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("Menu item created. ItemId: {ItemId}, Name: {Name}, TenantKey: {TenantKey}",
                menuItem.ItemId, menuItem.Name, tenantKey);

            return new MenuItemResponse
            {
                ItemId = menuItem.ItemId,
                Name = menuItem.Name,
                Description = menuItem.Description,
                Price = menuItem.Price,
                CategoryId = menuItem.CategoryId,
                CategoryName = category.Name,
                IsAvailable = menuItem.IsAvailable,
                ImageUrl = menuItem.ImageUrl
            };
        }

        public async Task<MenuItemResponse> UpdateMenuItemAsync(Guid itemId, UpdateMenuItemRequest request, ClaimsPrincipal user, string tenantKey)
        {
            if (string.IsNullOrEmpty(tenantKey))
                throw new ArgumentException("Tenant key is missing.");

            await ValidateAdminAndGetUserIdAsync(user, tenantKey);

            if (string.IsNullOrEmpty(request.Name))
                throw new ArgumentException("Menu item name is required.");

            var menuItem = await _dbContext.MenuItems
                .Include(m => m.Category)
                .FirstOrDefaultAsync(m => m.ItemId == itemId);
            if (menuItem == null)
                throw new ArgumentException("Menu item not found.");

            var category = await _dbContext.Categories
                .FirstOrDefaultAsync(c => c.CategoryId == request.CategoryId && c.IsActive);
            if (category == null)
                throw new ArgumentException("Category not found or inactive.");

            menuItem.Name = request.Name;
            menuItem.Description = request.Description;
            menuItem.Price = request.Price;
            menuItem.CategoryId = request.CategoryId;
            menuItem.IsAvailable = request.IsAvailable;
            menuItem.ImageUrl = request.ImageUrl;
            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("Menu item updated. ItemId: {ItemId}, Name: {Name}, TenantKey: {TenantKey}",
                menuItem.ItemId, menuItem.Name, tenantKey);

            return new MenuItemResponse
            {
                ItemId = menuItem.ItemId,
                Name = menuItem.Name,
                Description = menuItem.Description,
                Price = menuItem.Price,
                CategoryId = menuItem.CategoryId,
                CategoryName = category.Name,
                IsAvailable = menuItem.IsAvailable,
                ImageUrl = menuItem.ImageUrl
            };
        }

        public async Task DeleteMenuItemAsync(Guid itemId, ClaimsPrincipal user, string tenantKey)
        {
            if (string.IsNullOrEmpty(tenantKey))
                throw new ArgumentException("Tenant key is missing.");

            await ValidateAdminAndGetUserIdAsync(user, tenantKey);

            var menuItem = await _dbContext.MenuItems
                .FirstOrDefaultAsync(m => m.ItemId == itemId);
            if (menuItem == null)
                throw new ArgumentException("Menu item not found.");

            var hasOrders = await _dbContext.OrderItems
                .AnyAsync(oi => oi.ItemId == itemId);
            if (hasOrders)
                throw new ArgumentException("Cannot delete menu item with associated orders.");

            _dbContext.MenuItems.Remove(menuItem);
            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("Menu item deleted. ItemId: {ItemId}, TenantKey: {TenantKey}",
                itemId, tenantKey);
        }

        public async Task<List<MenuItemResponse>> GetMenuItemsAsync(string tenantKey)
        {
            if (string.IsNullOrEmpty(tenantKey))
                throw new ArgumentException("Tenant key is missing.");

            var menuItems = await _dbContext.MenuItems
                .Include(m => m.Category)
                .Where(m => m.IsAvailable && m.Category.IsActive)
                .Select(m => new MenuItemResponse
                {
                    ItemId = m.ItemId,
                    Name = m.Name,
                    Description = m.Description,
                    Price = m.Price,
                    CategoryId = m.CategoryId,
                    CategoryName = m.Category.Name,
                    IsAvailable = m.IsAvailable,
                    ImageUrl = m.ImageUrl
                })
                .ToListAsync();

            return menuItems;
        }

        public async Task<MenuItemResponse> GetMenuItemAsync(Guid itemId, string tenantKey)
        {
            if (string.IsNullOrEmpty(tenantKey))
                throw new ArgumentException("Tenant key is missing.");

            var menuItem = await _dbContext.MenuItems
                .Include(m => m.Category)
                .FirstOrDefaultAsync(m => m.ItemId == itemId);
            if (menuItem == null)
                throw new ArgumentException("Menu item not found.");

            return new MenuItemResponse
            {
                ItemId = menuItem.ItemId,
                Name = menuItem.Name,
                Description = menuItem.Description,
                Price = menuItem.Price,
                CategoryId = menuItem.CategoryId,
                CategoryName = menuItem.Category.Name,
                IsAvailable = menuItem.IsAvailable,
                ImageUrl = menuItem.ImageUrl
            };
        }

        //------------------changes for adding get menu items by category----------------------
        public async Task<List<MenuItemResponse>> GetMenuItemsByCategoryAsync(Guid categoryId, string tenantKey)
        {
            if (string.IsNullOrEmpty(tenantKey))
                throw new ArgumentException("Tenant key is missing.");

            // Verify category exists and is active
            var category = await _dbContext.Categories
                .FirstOrDefaultAsync(c => c.CategoryId == categoryId && c.IsActive);

            if (category == null)
                throw new ArgumentException("Category not found or inactive.");

            var menuItems = await _dbContext.MenuItems
                .Include(m => m.Category)
                .Where(m => m.CategoryId == categoryId && m.IsAvailable && m.Category.IsActive)
                .Select(m => new MenuItemResponse
                {
                    ItemId = m.ItemId,
                    Name = m.Name,
                    Description = m.Description,
                    Price = m.Price,
                    CategoryId = m.CategoryId,
                    CategoryName = m.Category.Name,
                    IsAvailable = m.IsAvailable,
                    ImageUrl = m.ImageUrl
                })
                .OrderBy(m => m.Name) // Optional: order by name
                .ToListAsync();

            _logger.LogDebug("Retrieved {Count} menu items for category {CategoryId}",
                menuItems.Count, categoryId);

            return menuItems;
        }
        //------------------end changes----------------------
    }
    //------------------end changes----------------------
}