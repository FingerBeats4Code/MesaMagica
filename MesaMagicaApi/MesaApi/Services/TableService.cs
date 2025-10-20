// MesaMagicaApi/MesaApi/Services/TableService.cs
using MesaApi.Controllers;
using MesaApi.Models;
using MesaApi.Multitenancy;
using MesaMagica.Api.Data;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace MesaApi.Services
{
    public class TableService : TenantAwareService, ITableService
    {
        public TableService(
            ApplicationDbContext dbContext,
            ITenantContext tenantContext,
            ILogger<TableService> logger)
            : base(dbContext, tenantContext, logger)
        {
        }

        public async Task<TableResponse> CreateTableAsync(CreateTableRequest request, ClaimsPrincipal user, string tenantKey)
        {
            if (string.IsNullOrEmpty(tenantKey))
                throw new ArgumentException("Tenant key is missing.");

            await ValidateAdminAndGetUserIdAsync(user, tenantKey);

            // Check if table number already exists
            var existingTable = await _dbContext.RestaurantTables
                .FirstOrDefaultAsync(t => t.TableNumber == request.TableNumber);

            if (existingTable != null)
                throw new ArgumentException($"Table {request.TableNumber} already exists");

            var table = new RestaurantTable
            {
                TableNumber = request.TableNumber,
                TableSeatSize = request.SeatCapacity,
                IsOccupied = false,
                CreatedAt = DateTime.UtcNow,
                QRCodeUrl = GenerateQRCodeUrl(request.TableNumber)
            };

            _dbContext.RestaurantTables.Add(table);
            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("Table {TableNumber} created by {User}", request.TableNumber, user.Identity?.Name);

            return MapToTableResponse(table);
        }

        public async Task<List<TableResponse>> GetTablesAsync(string tenantKey)
        {
            if (string.IsNullOrEmpty(tenantKey))
                throw new ArgumentException("Tenant key is missing.");

            var tables = await _dbContext.RestaurantTables
                .OrderBy(t => t.TableNumber)
                .ToListAsync();

            return tables.Select(MapToTableResponse).ToList();
        }

        public async Task<TableResponse> GetTableAsync(int tableId, string tenantKey)
        {
            if (string.IsNullOrEmpty(tenantKey))
                throw new ArgumentException("Tenant key is missing.");

            var table = await _dbContext.RestaurantTables.FindAsync(tableId);
            if (table == null)
                throw new ArgumentException("Table not found");

            return MapToTableResponse(table);
        }

        public async Task<TableResponse> UpdateTableAsync(int tableId, UpdateTableRequest request, ClaimsPrincipal user, string tenantKey)
        {
            if (string.IsNullOrEmpty(tenantKey))
                throw new ArgumentException("Tenant key is missing.");

            await ValidateAdminAndGetUserIdAsync(user, tenantKey);

            var table = await _dbContext.RestaurantTables.FindAsync(tableId);
            if (table == null)
                throw new ArgumentException("Table not found");

            if (!string.IsNullOrEmpty(request.TableNumber))
            {
                var existingTable = await _dbContext.RestaurantTables
                    .FirstOrDefaultAsync(t => t.TableNumber == request.TableNumber && t.TableId != tableId);
                if (existingTable != null)
                    throw new ArgumentException($"Table number {request.TableNumber} already exists");

                table.TableNumber = request.TableNumber;
                table.QRCodeUrl = GenerateQRCodeUrl(request.TableNumber);
            }

            if (request.SeatCapacity.HasValue)
                table.TableSeatSize = request.SeatCapacity.Value;

            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("Table {TableId} updated by {User}", tableId, user.Identity?.Name);

            return MapToTableResponse(table);
        }

        public async Task DeleteTableAsync(int tableId, ClaimsPrincipal user, string tenantKey)
        {
            if (string.IsNullOrEmpty(tenantKey))
                throw new ArgumentException("Tenant key is missing.");

            await ValidateAdminAndGetUserIdAsync(user, tenantKey);

            var table = await _dbContext.RestaurantTables.FindAsync(tableId);
            if (table == null)
                throw new ArgumentException("Table not found");

            // Check if table has active sessions
            var hasActiveSessions = await _dbContext.TableSessions
                .AnyAsync(s => s.TableId == tableId && s.IsActive);

            if (hasActiveSessions)
                throw new InvalidOperationException("Cannot delete table with active sessions");

            _dbContext.RestaurantTables.Remove(table);
            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("Table {TableId} deleted by {User}", tableId, user.Identity?.Name);
        }

        private string GenerateQRCodeUrl(string tableNumber)
        {
            var tenantSlug = _tenantContext.Slug;
            var baseUrl = $"http://localhost.{tenantSlug}:8000";
            return $"{baseUrl}/?tableId={tableNumber}";
        }

        private TableResponse MapToTableResponse(RestaurantTable table)
        {
            return new TableResponse
            {
                TableId = table.TableId,
                TableNumber = table.TableNumber,
                QRCodeUrl = table.QRCodeUrl,
                SeatCapacity = table.TableSeatSize,
                IsOccupied = table.IsOccupied,
                CreatedAt = table.CreatedAt
            };
        }
    }
}