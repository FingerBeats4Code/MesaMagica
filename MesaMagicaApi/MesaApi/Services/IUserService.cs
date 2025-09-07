using MesaApi.Models;
using System.Security.Claims;

namespace MesaApi.Services
{
    public interface IUsersService
    {
        Task<UserResponse> CreateUserAsync(CreateUserRequest request, ClaimsPrincipal user, string tenantSlug);
        Task<UserResponse> UpdateUserAsync(Guid userId, UpdateUserRequest request, ClaimsPrincipal user, string tenantSlug);
        Task DeleteUserAsync(Guid userId, ClaimsPrincipal user, string tenantSlug);
        Task<List<UserResponse>> GetUsersAsync(ClaimsPrincipal user, string tenantSlug);
        Task<UserResponse> GetUserAsync(Guid userId, ClaimsPrincipal user, string tenantSlug);
    }
}