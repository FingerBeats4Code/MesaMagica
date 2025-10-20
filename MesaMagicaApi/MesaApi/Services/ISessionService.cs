// Services/ISessionService.cs
using MesaApi.Models;
using System.Security.Claims;

namespace MesaApi.Services;
public interface ISessionService
{
    Task<(TableSession session, string jwt)> StartSessionAsync(Guid tableId, CancellationToken ct = default); // CHANGED
    Task<TableSession?> GetActiveAsync(Guid sessionId, CancellationToken ct = default);
    //Task UpdateSessionStatusAsync(Guid sessionId, UpdateSessionStatusRequest request, ClaimsPrincipal user, string tenantSlug, string tenantKey, CancellationToken ct = default);
}
