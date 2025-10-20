// MesaMagicaApi/MesaApi/Services/ITableService.cs
using MesaApi.Controllers;
using System.Security.Claims;

namespace MesaApi.Services
{
    public interface ITableService
    {
        Task<TableResponse> CreateTableAsync(CreateTableRequest request, ClaimsPrincipal user, string tenantKey);
        Task<List<TableResponse>> GetTablesAsync(string tenantKey);
        Task<TableResponse> GetTableAsync(int tableId, string tenantKey);
        Task<TableResponse> UpdateTableAsync(int tableId, UpdateTableRequest request, ClaimsPrincipal user, string tenantKey);
        Task DeleteTableAsync(int tableId, ClaimsPrincipal user, string tenantKey);
    }
}