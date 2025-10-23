// MesaMagicaApi/MesaApi/Services/ITableService.cs
using MesaApi.Controllers;
using System.Security.Claims;

namespace MesaApi.Services
{
    public interface ITableService
    {
        Task<TableResponse> CreateTableAsync(CreateTableRequest request, ClaimsPrincipal user, string tenantKey);
        Task<List<TableResponse>> GetTablesAsync(string tenantKey);
        Task<TableResponse> GetTableAsync(Guid tableId, string tenantKey); // CHANGED
        Task<TableResponse> UpdateTableAsync(Guid tableId, UpdateTableRequest request, ClaimsPrincipal user, string tenantKey); // CHANGED
        Task DeleteTableAsync(Guid tableId, ClaimsPrincipal user, string tenantKey); // CHANGED
        Task<TableResponse> ToggleTableOccupancyAsync(Guid tableId, ClaimsPrincipal user, string tenantKey);
    }
}