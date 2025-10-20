// MesaMagicaApi/MesaApi/Controllers/AuthController.cs
using MesaApi.Models;
using MesaApi.Multitenancy;
using MesaApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;

namespace MesaApi.Controllers
{
    [Route("api/auth")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly ITenantContext _tenantContext;
        private readonly ILogger<AuthController> _logger;

        public AuthController(
            IAuthService authService,
            ITenantContext tenantContext,
            ILogger<AuthController> logger)
        {
            _authService = authService ?? throw new ArgumentNullException(nameof(authService));
            _tenantContext = tenantContext ?? throw new ArgumentNullException(nameof(tenantContext));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Admin/Staff login endpoint
        /// </summary>
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] AdminLoginRequest request)
        {
            if (string.IsNullOrEmpty(_tenantContext.Slug))
            {
                _logger.LogWarning("Login attempt with missing tenant slug");
                return BadRequest("Tenant slug is missing.");
            }

            try
            {
                _logger.LogInformation("Login attempt for user: {Username} in tenant: {TenantSlug}",
                    request.Username, _tenantContext.Slug);

                var response = await _authService.LoginAsync(
                    new LoginRequest
                    {
                        Username = request.Username,
                        Password = request.Password
                    },
                    _tenantContext.Slug
                );

                _logger.LogInformation("Login successful for user: {Username}, Role: {Role}",
                    request.Username, response.Role);

                return Ok(response);
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning(ex, "Login failed for user: {Username} in tenant: {TenantSlug}",
                    request.Username, _tenantContext.Slug);
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during login for user: {Username}", request.Username);
                return StatusCode(500, new { message = "An error occurred during login" });
            }
        }

        /// <summary>
        /// Change password for authenticated user
        /// </summary>
        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            if (string.IsNullOrEmpty(_tenantContext.Slug))
            {
                _logger.LogWarning("Change password attempt with missing tenant slug");
                return BadRequest("Tenant slug is missing.");
            }

            try
            {
                var username = User.Identity?.Name ?? "Unknown";
                _logger.LogInformation("Password change request for user: {Username} in tenant: {TenantSlug}",
                    username, _tenantContext.Slug);

                await _authService.ChangePasswordAsync(request, User, _tenantContext.Slug);

                _logger.LogInformation("Password changed successfully for user: {Username}", username);
                return Ok(new { message = "Password changed successfully" });
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid password change request");
                return BadRequest(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning(ex, "Unauthorized password change attempt");
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error changing password");
                return StatusCode(500, new { message = "Error changing password" });
            }
        }

        /// <summary>
        /// Logout endpoint (optional - mainly clears server-side session if needed)
        /// </summary>
        [HttpPost("logout")]
        [Authorize]
        public IActionResult Logout()
        {
            var username = User.Identity?.Name ?? "Unknown";
            _logger.LogInformation("User logged out: {Username}", username);

            // In JWT-based auth, logout is primarily handled client-side by removing the token
            // Add any server-side cleanup here if needed (e.g., token blacklisting)

            return Ok(new { message = "Logged out successfully" });
        }

        /// <summary>
        /// Get current authenticated user info
        /// </summary>
        [HttpGet("me")]
        [Authorize]
        public IActionResult GetCurrentUser()
        {
            var username = User.Identity?.Name;
            var role = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Role)?.Value;
            var userId = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

            return Ok(new
            {
                username,
                role,
                userId,
                isAuthenticated = User.Identity?.IsAuthenticated ?? false
            });
        }
    }

    /// <summary>
    /// Admin login request model
    /// </summary>
    public class AdminLoginRequest
    {
        [Required(ErrorMessage = "Username is required")]
        [MinLength(3, ErrorMessage = "Username must be at least 3 characters")]
        public string Username { get; set; } = string.Empty;

        [Required(ErrorMessage = "Password is required")]
        [MinLength(6, ErrorMessage = "Password must be at least 6 characters")]
        public string Password { get; set; } = string.Empty;

        /// <summary>
        /// Tenant slug (optional, will be extracted from context if not provided)
        /// </summary>
        public string? TenantSlug { get; set; }
    }
}