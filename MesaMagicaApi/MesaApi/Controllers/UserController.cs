using MesaApi.Models;
using MesaApi.Multitenancy;
using MesaApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MesaApi.Controllers
{
    [Route("api/users")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class UsersController : ControllerBase
    {
        private readonly IUsersService _usersService;
        private readonly ITenantContext _tenantContext;

        public UsersController(IUsersService usersService, ITenantContext tenantContext)
        {
            _usersService = usersService ?? throw new ArgumentNullException(nameof(usersService));
            _tenantContext = tenantContext ?? throw new ArgumentNullException(nameof(tenantContext));
        }

        // Phase 5: Updated to match CreateUserAsync signature
        [HttpPost]
        public async Task<ActionResult<UserResponse>> CreateUser([FromBody] CreateUserRequest request)
        {
            if (string.IsNullOrEmpty(_tenantContext.Slug))
                return BadRequest("Tenant slug is missing.");

            try
            {
                var user = await _usersService.CreateUserAsync(request, User, _tenantContext.Slug);
                return CreatedAtAction(nameof(GetUser), new { userId = user.UserId }, user);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(ex.Message);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Phase 5: Updated to match UpdateUserAsync signature
        [HttpPut("{userId}")]
        public async Task<ActionResult<UserResponse>> UpdateUser(Guid userId, [FromBody] UpdateUserRequest request)
        {
            if (string.IsNullOrEmpty(_tenantContext.Slug))
                return BadRequest("Tenant slug is missing.");

            try
            {
                var user = await _usersService.UpdateUserAsync(userId, request, User, _tenantContext.Slug);
                return Ok(user);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(ex.Message);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Phase 5: Updated to match DeleteUserAsync signature
        [HttpDelete("{userId}")]
        public async Task<IActionResult> DeleteUser(Guid userId)
        {
            if (string.IsNullOrEmpty(_tenantContext.Slug))
                return BadRequest("Tenant slug is missing.");

            try
            {
                await _usersService.DeleteUserAsync(userId, User, _tenantContext.Slug);
                return NoContent();
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(ex.Message);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Phase 5: Updated to match GetUserAsync signature
        [HttpGet("{userId}")]
        public async Task<ActionResult<UserResponse>> GetUser(Guid userId)
        {
            if (string.IsNullOrEmpty(_tenantContext.Slug))
                return BadRequest("Tenant slug is missing.");

            try
            {
                var user = await _usersService.GetUserAsync(userId, User, _tenantContext.Slug);
                return Ok(user);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Phase 5: Added endpoint for GetUsersAsync
        [HttpGet]
        public async Task<ActionResult<List<UserResponse>>> GetUsers()
        {
            if (string.IsNullOrEmpty(_tenantContext.Slug))
                return BadRequest("Tenant slug is missing.");

            try
            {
                var users = await _usersService.GetUsersAsync(User, _tenantContext.Slug);
                return Ok(users);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(ex.Message);
            }
        }
    }
}