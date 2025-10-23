using MesaApi.Common;
using MesaApi.Models;
using MesaApi.Multitenancy;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using BCrypt.Net;
using MesaMagica.Api.Data;

public class AuthService : IAuthService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly ITenantContext _tenantContext;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        ApplicationDbContext dbContext,
        ITenantContext tenantContext,
        IConfiguration configuration,
        ILogger<AuthService> logger)
    {
        _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
        _tenantContext = tenantContext ?? throw new ArgumentNullException(nameof(tenantContext));
        _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request, string tenantSlug)
    {
        if (string.IsNullOrEmpty(tenantSlug))
            throw new ArgumentException("Tenant slug is missing.");

        var user = await _dbContext.Users
            .FirstOrDefaultAsync(u => u.Username == request.Username);
        if (user == null)
        {
            _logger.LogWarning("Login failed: User {Username} not found for tenant {TenantSlug}",
                request.Username, tenantSlug);
            throw new UnauthorizedAccessException("Invalid username or password.");
        }

        if (user.LockedUntil.HasValue && user.LockedUntil > DateTime.UtcNow)
        {
            _logger.LogWarning("Login failed: User {Username} is locked until {LockedUntil}",
                request.Username, user.LockedUntil);
            throw new UnauthorizedAccessException(
                $"Account is locked until {user.LockedUntil.Value.ToString("o")}.");
        }

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            user.FailedLoginAttempts++;
            if (user.FailedLoginAttempts >= 5)
                user.LockedUntil = DateTime.UtcNow.AddMinutes(15);
            await _dbContext.SaveChangesAsync();
            _logger.LogWarning("Login failed: Invalid password for user {Username}. Attempts: {Attempts}",
                request.Username, user.FailedLoginAttempts);
            throw new UnauthorizedAccessException("Invalid username or password.");
        }

        if (!user.IsActive)
        {
            _logger.LogWarning("Login failed: User {Username} is inactive", request.Username);
            throw new UnauthorizedAccessException("User account is inactive.");
        }

        user.FailedLoginAttempts = 0;
        await _dbContext.SaveChangesAsync();

        var token = GenerateJwtToken(user, tenantSlug);
        _logger.LogInformation("User {Username} logged in successfully for tenant {TenantSlug}",
            request.Username, tenantSlug);

        return new LoginResponse
        {
            Token = token,
            Role = user.Role,
            UserId = user.UserId
        };
    }

    public async Task ChangePasswordAsync(ChangePasswordRequest request, ClaimsPrincipal userPrincipal, string tenantSlug)
    {
        if (string.IsNullOrEmpty(tenantSlug))
            throw new ArgumentException("Tenant slug is missing.");

        var userIdClaim = userPrincipal.FindFirst(JwtClaims.UserId)?.Value; // CHANGED
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            throw new UnauthorizedAccessException("Invalid user ID in token.");

        var user = await _dbContext.Users
            .FirstOrDefaultAsync(u => u.UserId == userId && u.IsActive);
        if (user == null)
            throw new UnauthorizedAccessException("User not found or inactive.");

        var userTenantSlug = userPrincipal.FindFirst(JwtClaims.TenantSlug)?.Value;
        if (userTenantSlug != tenantSlug)
            throw new UnauthorizedAccessException("Tenant mismatch in request.");

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
        {
            _logger.LogWarning("Password change failed: Invalid current password for user {UserId}", userId);
            throw new ArgumentException("Current password is incorrect.");
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;
        user.UpdatedBy = userId;
        user.FailedLoginAttempts = 0;
        user.LockedUntil = null;
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Password changed for user {UserId} in tenant {TenantSlug}", userId, tenantSlug);
    }

    //------------------changes for using constants instead of magic strings----------------------
    private string GenerateJwtToken(User user, string tenantSlug)
    {
        var claims = new[]
        {
        new Claim(ClaimTypes.Name, user.Username), // Username goes here
        new Claim(JwtClaims.UserId, user.UserId.ToString()), // Custom claim for UserId
        new Claim(ClaimTypes.Role, user.Role),
        new Claim(JwtClaims.TenantSlug, tenantSlug),
        new Claim(JwtClaims.TenantKey, _tenantContext.TenantKey),
        new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
    };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(2),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
    //------------------end changes----------------------
}