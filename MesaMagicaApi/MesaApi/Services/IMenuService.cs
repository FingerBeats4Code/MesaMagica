using MesaApi.Models;
using System.Security.Claims;

namespace MesaApi.Services
{
    public interface IMenuService
    {
        Task<MenuItemResponse> CreateMenuItemAsync(CreateMenuItemRequest request, ClaimsPrincipal user, string tenantSlug);
        Task<MenuItemResponse> UpdateMenuItemAsync(Guid itemId, UpdateMenuItemRequest request, ClaimsPrincipal user, string tenantSlug);
        Task DeleteMenuItemAsync(Guid itemId, ClaimsPrincipal user, string tenantSlug);
        Task<List<MenuItemResponse>> GetMenuItemsAsync(string tenantSlug);
        Task<MenuItemResponse> GetMenuItemAsync(Guid itemId, string tenantSlug);
    }
}
