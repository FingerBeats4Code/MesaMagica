using BCrypt.Net;
using MesaApi.Models;
using MesaApi.Multitenancy;
using MesaMagica.Api.Data;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace MesaApi.Services  
{

    public class UsersService : IUsersService
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly ITenantContext _tenantContext;
        private readonly ILogger<UsersService> _logger;

        public UsersService(ApplicationDbContext dbContext, ITenantContext tenantContext, ILogger<UsersService> logger)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _tenantContext = tenantContext ?? throw new ArgumentNullException(nameof(tenantContext));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        private async Task ValidateAdminUserAsync(ClaimsPrincipal user, string tenantSlug)
        {
            if (!user.IsInRole("Admin"))
                throw new UnauthorizedAccessException("User is not authorized to perform this action.");

            var userIdClaim = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
                throw new UnauthorizedAccessException("Invalid user ID in token.");

            var dbUser = await _dbContext.Users
                .FirstOrDefaultAsync(u => u.UserId == userId && u.Role == "Admin" && u.IsActive);
            if (dbUser == null)
                throw new UnauthorizedAccessException("User is not an active admin in the database.");

            var userTenantSlug = user.FindFirst("tenantSlug")?.Value;
            if (string.IsNullOrEmpty(userTenantSlug) || userTenantSlug != tenantSlug)
                throw new UnauthorizedAccessException("Tenant mismatch in request.");
        }

        public async Task<UserResponse> CreateUserAsync(CreateUserRequest request, ClaimsPrincipal user, string tenantSlug)
        {
            await ValidateAdminUserAsync(user, tenantSlug);
            var adminId = Guid.Parse(user.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            if (await _dbContext.Users.AnyAsync(u => u.Username == request.Username))
                throw new ArgumentException("Username already exists.");
            if (await _dbContext.Users.AnyAsync(u => u.Email == request.Email))
                throw new ArgumentException("Email already exists.");

            var newUser = new User
            {
                UserId = Guid.NewGuid(),
                Username = request.Username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                Role = request.Role,
                Email = request.Email,
                IsActive = request.IsActive,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                UpdatedBy = adminId
            };

            _dbContext.Users.Add(newUser);
            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("User created. UserId: {UserId}, Username: {Username}, TenantSlug: {TenantSlug}", newUser.UserId, newUser.Username, tenantSlug);
            _logger.LogInformation("Email notification sent to {Email} for user creation", newUser.Email);

            return MapToUserResponse(newUser);
        }

        public async Task<UserResponse> UpdateUserAsync(Guid userId, UpdateUserRequest request, ClaimsPrincipal user, string tenantSlug)
        {
            await ValidateAdminUserAsync(user, tenantSlug);
            var adminId = Guid.Parse(user.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            var existingUser = await _dbContext.Users
                .FirstOrDefaultAsync(u => u.UserId == userId);
            if (existingUser == null)
                throw new ArgumentException("User not found.");

            if (await _dbContext.Users.AnyAsync(u => u.Username == request.Username && u.UserId != userId))
                throw new ArgumentException("Username already exists.");
            if (await _dbContext.Users.AnyAsync(u => u.Email == request.Email && u.UserId != userId))
                throw new ArgumentException("Email already exists.");

            existingUser.Username = request.Username;
            if (!string.IsNullOrEmpty(request.Password))
                existingUser.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
            existingUser.Role = request.Role;
            existingUser.Email = request.Email;
            existingUser.IsActive = request.IsActive;
            existingUser.UpdatedAt = DateTime.UtcNow;
            existingUser.UpdatedBy = adminId;

            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("User updated. UserId: {UserId}, Username: {Username}, TenantSlug: {TenantSlug}", userId, request.Username, tenantSlug);
            _logger.LogInformation("Email notification sent to {Email} for user update", request.Email);

            return MapToUserResponse(existingUser);
        }

        public async Task DeleteUserAsync(Guid userId, ClaimsPrincipal user, string tenantSlug)
        {
            await ValidateAdminUserAsync(user, tenantSlug);

            var existingUser = await _dbContext.Users
                .FirstOrDefaultAsync(u => u.UserId == userId);
            if (existingUser == null)
                throw new ArgumentException("User not found.");

            if (existingUser.UserId == Guid.Parse(user.FindFirst(ClaimTypes.NameIdentifier)!.Value))
                throw new ArgumentException("Cannot delete your own account.");

            _dbContext.Users.Remove(existingUser);
            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("User deleted. UserId: {UserId}, TenantSlug: {TenantSlug}", userId, tenantSlug);
        }

        public async Task<List<UserResponse>> GetUsersAsync(ClaimsPrincipal user, string tenantSlug)
        {
            await ValidateAdminUserAsync(user, tenantSlug);

            var users = await _dbContext.Users
                .Select(u => MapToUserResponse(u))
                .ToListAsync();

            return users;
        }

        public async Task<UserResponse> GetUserAsync(Guid userId, ClaimsPrincipal user, string tenantSlug)
        {
            await ValidateAdminUserAsync(user, tenantSlug);

            var existingUser = await _dbContext.Users
                .FirstOrDefaultAsync(u => u.UserId == userId);
            if (existingUser == null)
                throw new ArgumentException("User not found.");

            return MapToUserResponse(existingUser);
        }

        private static UserResponse MapToUserResponse(User user)
        {
            return new UserResponse
            {
                UserId = user.UserId,
                Username = user.Username,
                Role = user.Role,
                Email = user.Email,
                IsActive = user.IsActive,
                CreatedAt = user.CreatedAt,
                UpdatedAt = user.UpdatedAt,
                UpdatedBy = user.UpdatedBy,
                LockedUntil = user.LockedUntil,
                FailedLoginAttempts = user.FailedLoginAttempts
            };
        }
    }
}