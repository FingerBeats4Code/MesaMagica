// MesaMagicaApi/MesaApi/Controllers/StaffController.cs
using MesaApi.Common;
using MesaApi.Models;
using MesaApi.Multitenancy;
using MesaApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace MesaApi.Controllers
{
    [Route("api/admin/staff")]
    [ApiController]
    [Authorize(Roles = "Admin")] // Only admins can manage staff
    public class StaffController : ControllerBase
    {
        private readonly IUsersService _usersService;
        private readonly ITenantContext _tenantContext;
        private readonly ILogger<StaffController> _logger;

        public StaffController(
            IUsersService usersService,
            ITenantContext tenantContext,
            ILogger<StaffController> logger)
        {
            _usersService = usersService ?? throw new ArgumentNullException(nameof(usersService));
            _tenantContext = tenantContext ?? throw new ArgumentNullException(nameof(tenantContext));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Get all staff members
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetStaff()
        {
            if (string.IsNullOrEmpty(_tenantContext.Slug))
            {
                _logger.LogWarning("Get staff attempt with missing tenant slug");
                return BadRequest("Tenant slug is missing.");
            }

            try
            {
                _logger.LogInformation("Fetching staff list for tenant: {TenantSlug}", _tenantContext.Slug);

                var users = await _usersService.GetUsersAsync(User, _tenantContext.Slug);

                _logger.LogInformation("Retrieved {Count} staff members", users.Count);

                return Ok(users.Select(u => new StaffResponse
                {
                    Id = u.UserId.ToString(),
                    Username = u.Username,
                    Role = u.Role,
                    Email = u.Email,
                    IsActive = u.IsActive,
                    CreatedAt = u.CreatedAt,
                    UpdatedAt = u.UpdatedAt
                }));
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning(ex, "Unauthorized access to staff list");
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching staff list");
                return StatusCode(500, new { message = "Error fetching staff list" });
            }
        }

        /// <summary>
        /// Get specific staff member by ID
        /// </summary>
        [HttpGet("{userId}")]
        public async Task<IActionResult> GetStaffMember(Guid userId)
        {
            if (string.IsNullOrEmpty(_tenantContext.Slug))
            {
                _logger.LogWarning("Get staff member attempt with missing tenant slug");
                return BadRequest("Tenant slug is missing.");
            }

            try
            {
                _logger.LogInformation("Fetching staff member: {UserId}", userId);

                var user = await _usersService.GetUserAsync(userId, User, _tenantContext.Slug);

                return Ok(new StaffResponse
                {
                    Id = user.UserId.ToString(),
                    Username = user.Username,
                    Role = user.Role,
                    Email = user.Email,
                    IsActive = user.IsActive,
                    CreatedAt = user.CreatedAt,
                    UpdatedAt = user.UpdatedAt
                });
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Staff member not found: {UserId}", userId);
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching staff member: {UserId}", userId);
                return StatusCode(500, new { message = "Error fetching staff member" });
            }
        }

        /// <summary>
        /// Add new staff member
        /// </summary>
        [HttpPost("add")]
        public async Task<IActionResult> AddStaff([FromBody] AddStaffRequest request)
        {
            if (string.IsNullOrEmpty(_tenantContext.Slug))
            {
                _logger.LogWarning("Add staff attempt with missing tenant slug");
                return BadRequest("Tenant slug is missing.");
            }

            try
            {
                _logger.LogInformation("Creating new staff member: {Username} with role: {Role}",
                    request.Username, request.Role);

                var createRequest = new CreateUserRequest
                {
                    Username = request.Username,
                    Password = request.Password,
                    Role = request.Role,
                    Email = request.Email,
                    IsActive = true
                };

                var user = await _usersService.CreateUserAsync(createRequest, User, _tenantContext.Slug);

                _logger.LogInformation("Staff member created successfully: {UserId}, Username: {Username}",
                    user.UserId, user.Username);

                return CreatedAtAction(
                    nameof(GetStaffMember),
                    new { userId = user.UserId },
                    new StaffResponse
                    {
                        Id = user.UserId.ToString(),
                        Username = user.Username,
                        Role = user.Role,
                        Email = user.Email,
                        IsActive = user.IsActive,
                        CreatedAt = user.CreatedAt
                    });
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid staff creation request");
                return BadRequest(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning(ex, "Unauthorized staff creation attempt");
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating staff member");
                return StatusCode(500, new { message = "Error creating staff member" });
            }
        }

        /// <summary>
        /// Update staff member role and details
        /// </summary>
        [HttpPut("update")]
        public async Task<IActionResult> UpdateStaff([FromBody] UpdateStaffRequest request)
        {
            if (string.IsNullOrEmpty(_tenantContext.Slug))
            {
                _logger.LogWarning("Update staff attempt with missing tenant slug");
                return BadRequest("Tenant slug is missing.");
            }

            if (!Guid.TryParse(request.Id, out var userId))
            {
                return BadRequest(new { message = "Invalid user ID format" });
            }

            try
            {
                _logger.LogInformation("Updating staff member: {UserId}", userId);

                var updateRequest = new UpdateUserRequest
                {
                    Username = request.Username,
                    Role = request.Role,
                    Email = request.Email,
                    IsActive = request.IsActive,
                    Password = request.Password // Optional - only if changing password
                };

                var user = await _usersService.UpdateUserAsync(userId, updateRequest, User, _tenantContext.Slug);

                _logger.LogInformation("Staff member updated successfully: {UserId}", userId);

                return Ok(new StaffResponse
                {
                    Id = user.UserId.ToString(),
                    Username = user.Username,
                    Role = user.Role,
                    Email = user.Email,
                    IsActive = user.IsActive,
                    CreatedAt = user.CreatedAt,
                    UpdatedAt = user.UpdatedAt
                });
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid staff update request");
                return BadRequest(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning(ex, "Unauthorized staff update attempt");
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating staff member: {UserId}", userId);
                return StatusCode(500, new { message = "Error updating staff member" });
            }
        }

        /// <summary>
        /// Delete staff member
        /// </summary>
        [HttpDelete("{userId}")]
        public async Task<IActionResult> DeleteStaff(Guid userId)
        {
            if (string.IsNullOrEmpty(_tenantContext.Slug))
            {
                _logger.LogWarning("Delete staff attempt with missing tenant slug");
                return BadRequest("Tenant slug is missing.");
            }

            try
            {
                _logger.LogInformation("Deleting staff member: {UserId}", userId);

                await _usersService.DeleteUserAsync(userId, User, _tenantContext.Slug);

                _logger.LogInformation("Staff member deleted successfully: {UserId}", userId);

                return Ok(new { message = "Staff member deleted successfully" });
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Staff member not found: {UserId}", userId);
                return BadRequest(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning(ex, "Unauthorized staff deletion attempt");
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting staff member: {UserId}", userId);
                return StatusCode(500, new { message = "Error deleting staff member" });
            }
        }

        /// <summary>
        /// Toggle staff member active status
        /// </summary>
        [HttpPatch("{userId}/toggle-active")]
        public async Task<IActionResult> ToggleStaffActive(Guid userId)
        {
            if (string.IsNullOrEmpty(_tenantContext.Slug))
            {
                _logger.LogWarning("Toggle staff active attempt with missing tenant slug");
                return BadRequest("Tenant slug is missing.");
            }

            try
            {
                _logger.LogInformation("Toggling active status for staff member: {UserId}", userId);

                var user = await _usersService.GetUserAsync(userId, User, _tenantContext.Slug);

                var updateRequest = new UpdateUserRequest
                {
                    Username = user.Username,
                    Role = user.Role,
                    Email = user.Email,
                    IsActive = !user.IsActive // Toggle
                };

                var updatedUser = await _usersService.UpdateUserAsync(userId, updateRequest, User, _tenantContext.Slug);

                _logger.LogInformation("Staff member active status toggled: {UserId}, IsActive: {IsActive}",
                    userId, updatedUser.IsActive);

                return Ok(new StaffResponse
                {
                    Id = updatedUser.UserId.ToString(),
                    Username = updatedUser.Username,
                    Role = updatedUser.Role,
                    Email = updatedUser.Email,
                    IsActive = updatedUser.IsActive,
                    CreatedAt = updatedUser.CreatedAt,
                    UpdatedAt = updatedUser.UpdatedAt
                });
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Staff member not found: {UserId}", userId);
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error toggling staff active status: {UserId}", userId);
                return StatusCode(500, new { message = "Error toggling staff active status" });
            }
        }
    }

    // Request Models
    public class AddStaffRequest
    {
        [Required(ErrorMessage = "Username is required")]
        [MinLength(3, ErrorMessage = "Username must be at least 3 characters")]
        public string Username { get; set; } = string.Empty;

        [Required(ErrorMessage = "Password is required")]
        [MinLength(8, ErrorMessage = "Password must be at least 8 characters")]
        public string Password { get; set; } = string.Empty;

        [Required(ErrorMessage = "Role is required")]
        [RegularExpression("Admin|Staff", ErrorMessage = "Role must be either 'Admin' or 'Staff'")]
        public string Role { get; set; } = string.Empty;

        [Required(ErrorMessage = "Email is required")]
        [EmailAddress(ErrorMessage = "Invalid email format")]
        public string Email { get; set; } = string.Empty;
    }

    public class UpdateStaffRequest
    {
        [Required]
        public string Id { get; set; } = string.Empty;

        [Required]
        [MinLength(3)]
        public string Username { get; set; } = string.Empty;

        [Required]
        [RegularExpression("Admin|Staff")]
        public string Role { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        public bool IsActive { get; set; } = true;

        [MinLength(8)]
        public string? Password { get; set; } // Optional - only if changing password
    }

    // Response Model
    public class StaffResponse
    {
        public string Id { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}