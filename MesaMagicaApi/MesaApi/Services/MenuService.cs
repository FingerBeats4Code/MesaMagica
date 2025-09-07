using MesaApi.Models;
using MesaApi.Multitenancy;
using MesaMagica.Api.Data;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace MesaApi.Services
{

    public class MenuService : IMenuService
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly ITenantContext _tenantContext;
        private readonly ILogger<MenuService> _logger;

        public MenuService(ApplicationDbContext dbContext, ITenantContext tenantContext, ILogger<MenuService> logger)
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

        public async Task<MenuItemResponse> CreateMenuItemAsync(CreateMenuItemRequest request, ClaimsPrincipal user, string tenantSlug)
        {
            if (string.IsNullOrEmpty(tenantSlug))
                throw new ArgumentException("Tenant slug is missing.");

            await ValidateAdminUserAsync(user, tenantSlug);

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

            _logger.LogInformation("Menu item created. ItemId: {ItemId}, Name: {Name}, TenantSlug: {TenantSlug}",
                menuItem.ItemId, menuItem.Name, tenantSlug);

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

        public async Task<MenuItemResponse> UpdateMenuItemAsync(Guid itemId, UpdateMenuItemRequest request, ClaimsPrincipal user, string tenantSlug)
        {
            if (string.IsNullOrEmpty(tenantSlug))
                throw new ArgumentException("Tenant slug is missing.");

            await ValidateAdminUserAsync(user, tenantSlug);

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

            _logger.LogInformation("Menu item updated. ItemId: {ItemId}, Name: {Name}, TenantSlug: {TenantSlug}",
                menuItem.ItemId, menuItem.Name, tenantSlug);

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

        public async Task DeleteMenuItemAsync(Guid itemId, ClaimsPrincipal user, string tenantSlug)
        {
            if (string.IsNullOrEmpty(tenantSlug))
                throw new ArgumentException("Tenant slug is missing.");

            await ValidateAdminUserAsync(user, tenantSlug);

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

            _logger.LogInformation("Menu item deleted. ItemId: {ItemId}, TenantSlug: {TenantSlug}",
                itemId, tenantSlug);
        }

        public async Task<List<MenuItemResponse>> GetMenuItemsAsync(string tenantSlug)
        {
            if (string.IsNullOrEmpty(tenantSlug))
                throw new ArgumentException("Tenant slug is missing.");

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

        public async Task<MenuItemResponse> GetMenuItemAsync(Guid itemId, string tenantSlug)
        {
            if (string.IsNullOrEmpty(tenantSlug))
                throw new ArgumentException("Tenant slug is missing.");

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
    }
}