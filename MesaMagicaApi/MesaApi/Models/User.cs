using System.ComponentModel.DataAnnotations;

namespace MesaApi.Models
{
    public class User
    {
        public Guid UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty; // Admin, Staff
        public string Email { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public Guid? UpdatedBy { get; set; }
        public User? UpdatedByUser { get; set; }
        public DateTime? LockedUntil { get; set; }
        public int FailedLoginAttempts { get; set; }
    }
    public class LoginRequest
    {
        [Required]
        public string Username { get; set; } = string.Empty;
        [Required]
        public string Password { get; set; } = string.Empty;
    }

    public class LoginResponse
    {
        public string Token { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public Guid UserId { get; set; }
    }

    public class ChangePasswordRequest
    {
        [Required]
        public string CurrentPassword { get; set; } = string.Empty;
        [Required, MinLength(8)]
        public string NewPassword { get; set; } = string.Empty;
    }

    public class CreateUserRequest
    {
        [Required, MinLength(3)]
        public string Username { get; set; } = string.Empty;
        [Required, MinLength(8)]
        public string Password { get; set; } = string.Empty;
        [Required, RegularExpression("Admin|Staff")]
        public string Role { get; set; } = string.Empty;
        [Required, EmailAddress]
        public string Email { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
    }

    public class UpdateUserRequest
    {
        [Required, MinLength(3)]
        public string Username { get; set; } = string.Empty;
        [MinLength(8)]
        public string? Password { get; set; }
        [Required, RegularExpression("Admin|Staff")]
        public string Role { get; set; } = string.Empty;
        [Required, EmailAddress]
        public string Email { get; set; } = string.Empty;
        public bool IsActive { get; set; }
    }

    public class UserResponse
    {
        public Guid UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public Guid? UpdatedBy { get; set; }
        public DateTime? LockedUntil { get; set; }
        public int FailedLoginAttempts { get; set; }
    }

}
