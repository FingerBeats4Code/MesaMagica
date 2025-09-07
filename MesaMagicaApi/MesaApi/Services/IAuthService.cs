using MesaApi.Models;
using System.Security.Claims;

public interface IAuthService
{
    Task<LoginResponse> LoginAsync(LoginRequest request, string tenantSlug);
    Task ChangePasswordAsync(ChangePasswordRequest request, ClaimsPrincipal user, string tenantSlug);
}