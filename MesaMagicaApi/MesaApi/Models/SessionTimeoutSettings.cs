// MesaMagicaApi/MesaApi/Models/SessionTimeoutSettings.cs
namespace MesaApi.Models
{
    public class SessionTimeoutSettings
    {
        /// <summary>
        /// Timeout in minutes for sessions without any orders (scan-only)
        /// </summary>
        public int InactiveSessionTimeout { get; set; } = 30;

        /// <summary>
        /// Timeout in minutes for sessions with served orders but unpaid
        /// </summary>
        public int ServedOrderTimeout { get; set; } = 90;

        /// <summary>
        /// How often to run the cleanup job (in minutes)
        /// </summary>
        public int CleanupIntervalMinutes { get; set; } = 5;

        /// <summary>
        /// Enable/disable automatic session cleanup
        /// </summary>
        public bool EnableAutoCleanup { get; set; } = true;
    }
}