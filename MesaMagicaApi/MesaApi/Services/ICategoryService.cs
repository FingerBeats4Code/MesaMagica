using MesaApi.Models;
using System.Security.Claims;

namespace MesaApi.Services
{
    public interface ICategoryService
    {
        Task<CategoryResponse> CreateCategoryAsync(CreateCategoryRequest request, ClaimsPrincipal user, string tenantSlug);
        Task<CategoryResponse> UpdateCategoryAsync(Guid categoryId, UpdateCategoryRequest request, ClaimsPrincipal user, string tenantSlug);
        Task DeleteCategoryAsync(Guid categoryId, ClaimsPrincipal user, string tenantSlug);
        Task<List<CategoryResponse>> GetCategoriesAsync(string tenantSlug);
        Task<CategoryResponse> GetCategoryAsync(Guid categoryId, string tenantSlug);
    }
}
