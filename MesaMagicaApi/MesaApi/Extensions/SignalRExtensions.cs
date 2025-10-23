using MesaApi.Configuration;
using MesaApi.Hubs;
using MesaApi.Models;
using MesaApi.Services.Notifications;
using Microsoft.AspNetCore.SignalR;
using StackExchange.Redis;

namespace MesaMagica.Api.Extensions;

public static class SignalRExtensions
{
    public static IServiceCollection AddSignalRWithRedis(
        this IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        // Configure SignalR
        var signalRConfig = configuration.GetSection("RealTimeConfiguration:SignalR")
            .Get<SignalRConfiguration>() ?? new SignalRConfiguration();

        services.Configure<SignalRConfiguration>(
            configuration.GetSection("RealTimeConfiguration:SignalR"));

        services.Configure<NotificationConfiguration>(
            configuration.GetSection("RealTimeConfiguration:Notifications"));

        var signalRBuilder = services.AddSignalR(options =>
        {
            options.EnableDetailedErrors = signalRConfig.EnableDetailedErrors || environment.IsDevelopment();
            options.KeepAliveInterval = TimeSpan.FromSeconds(signalRConfig.KeepAliveInterval);
            options.ClientTimeoutInterval = TimeSpan.FromSeconds(signalRConfig.ClientTimeoutInterval);
            options.HandshakeTimeout = TimeSpan.FromSeconds(signalRConfig.HandshakeTimeout);
            options.MaximumReceiveMessageSize = signalRConfig.MaxBufferSize;
        });

        // Add MessagePack protocol if enabled
        if (signalRConfig.EnableMessagePackProtocol)
        {
            signalRBuilder.AddMessagePackProtocol();
        }

        // Configure Redis backplane
        var redisSettings = configuration.GetSection("Redis").Get<RedisSettings>();

        if (environment.IsDevelopment())
        {
            // Development: Use local Redis or skip backplane
            if (!string.IsNullOrEmpty(redisSettings?.ConnectionString))
            {
                signalRBuilder.AddStackExchangeRedis(redisSettings.ConnectionString, options =>
                {
                    options.Configuration.ChannelPrefix = "mesamagica";
                });
            }
        }
        else
        {
            // Production: Always use Redis backplane
            if (string.IsNullOrEmpty(redisSettings?.ConnectionString))
            {
                throw new InvalidOperationException(
                    "Redis connection string is required for production SignalR");
            }

            signalRBuilder.AddStackExchangeRedis(redisSettings.ConnectionString, options =>
            {
                options.Configuration.ChannelPrefix = "mesamagica";
                options.Configuration.ConnectRetry = 3;
                options.Configuration.ReconnectRetryPolicy = new ExponentialRetry(1000, 30000);
                options.Configuration.AbortOnConnectFail = false;
                options.Configuration.KeepAlive = 60;
            });
        }

        // Register notification service
        services.AddScoped<INotificationService, NotificationService>();

        return services;
    }

    public static IApplicationBuilder UseSignalRHubs(this IApplicationBuilder app)
    {
        app.UseEndpoints(endpoints =>
        {
            endpoints.MapHub<NotificationHub>("/hubs/notifications");
        });

        return app;
    }
}