// Services/ISessionService.cs
using MesaApi.Models;

namespace MesaApi.Services;
public interface ISessionService
{
    Task<(TableSession session, string jwt)> StartSessionAsync(int tableId, CancellationToken ct = default);
    Task<TableSession?> GetActiveAsync(int sessionId, CancellationToken ct = default);
}
