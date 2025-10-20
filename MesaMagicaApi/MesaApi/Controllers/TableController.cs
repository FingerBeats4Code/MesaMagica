// MesaMagicaApi/MesaApi/Controllers/TableController.cs
using MesaApi.Common;
using MesaApi.Models;
using MesaApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;

namespace MesaApi.Controllers
{
    [Route("api/admin/tables")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class TableController : ControllerBase
    {
        private readonly ITableService _tableService;
        private readonly ILogger<TableController> _logger;

        public TableController(ITableService tableService, ILogger<TableController> logger)
        {
            _tableService = tableService;
            _logger = logger;
        }

        // POST: api/admin/tables/create
        [HttpPost("create")]
        public async Task<IActionResult> CreateTable([FromBody] CreateTableRequest request)
        {
            var tenantKey = User.FindFirst(JwtClaims.TenantKey)?.Value;
            if (string.IsNullOrEmpty(tenantKey))
                return Unauthorized("Tenant key not found in JWT.");

            try
            {
                var table = await _tableService.CreateTableAsync(request, User, tenantKey);
                return Ok(table);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating table");
                return StatusCode(500, "Error creating table");
            }
        }

        // GET: api/admin/tables
        [HttpGet]
        public async Task<IActionResult> GetTables()
        {
            var tenantKey = User.FindFirst(JwtClaims.TenantKey)?.Value;
            if (string.IsNullOrEmpty(tenantKey))
                return Unauthorized("Tenant key not found in JWT.");

            try
            {
                var tables = await _tableService.GetTablesAsync(tenantKey);
                return Ok(tables);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching tables");
                return StatusCode(500, "Error fetching tables");
            }
        }

        // GET: api/admin/tables/{tableId}
        [HttpGet("{tableId}")]
        public async Task<IActionResult> GetTable(int tableId)
        {
            var tenantKey = User.FindFirst(JwtClaims.TenantKey)?.Value;
            if (string.IsNullOrEmpty(tenantKey))
                return Unauthorized("Tenant key not found in JWT.");

            try
            {
                var table = await _tableService.GetTableAsync(tableId, tenantKey);
                return Ok(table);
            }
            catch (ArgumentException ex)
            {
                return NotFound(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching table");
                return StatusCode(500, "Error fetching table");
            }
        }

        // PUT: api/admin/tables/{tableId}
        [HttpPut("{tableId}")]
        public async Task<IActionResult> UpdateTable(int tableId, [FromBody] UpdateTableRequest request)
        {
            var tenantKey = User.FindFirst(JwtClaims.TenantKey)?.Value;
            if (string.IsNullOrEmpty(tenantKey))
                return Unauthorized("Tenant key not found in JWT.");

            try
            {
                var table = await _tableService.UpdateTableAsync(tableId, request, User, tenantKey);
                return Ok(table);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating table");
                return StatusCode(500, "Error updating table");
            }
        }

        // DELETE: api/admin/tables/{tableId}
        [HttpDelete("{tableId}")]
        public async Task<IActionResult> DeleteTable(int tableId)
        {
            var tenantKey = User.FindFirst(JwtClaims.TenantKey)?.Value;
            if (string.IsNullOrEmpty(tenantKey))
                return Unauthorized("Tenant key not found in JWT.");

            try
            {
                await _tableService.DeleteTableAsync(tableId, User, tenantKey);
                return Ok(new { message = "Table deleted successfully" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting table");
                return StatusCode(500, "Error deleting table");
            }
        }
    }

    // Request/Response Models
    public class CreateTableRequest
    {
        [Required]
        public string TableNumber { get; set; } = string.Empty;

        [Range(1, 20)]
        public int SeatCapacity { get; set; } = 4;
    }

    public class UpdateTableRequest
    {
        public string? TableNumber { get; set; }
        public int? SeatCapacity { get; set; }
        public bool? IsActive { get; set; }
    }

    public class TableResponse
    {
        public int TableId { get; set; }
        public string TableNumber { get; set; } = string.Empty;
        public string QRCodeUrl { get; set; } = string.Empty;
        public int SeatCapacity { get; set; }
        public bool IsOccupied { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}