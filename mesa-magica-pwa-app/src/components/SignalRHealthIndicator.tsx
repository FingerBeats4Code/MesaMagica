// mesa-magica-pwa-app/src/components/SignalRHealthIndicator.tsx
// ✅ NEW: Component to monitor and display SignalR connection health

import React, { useState, useEffect } from 'react';
import { signalRService } from '@/services/signalr.service';

interface SignalRHealthIndicatorProps {
  isAdmin?: boolean;
}

export const SignalRHealthIndicator: React.FC<SignalRHealthIndicatorProps> = ({ isAdmin = false }) => {
  const [health, setHealth] = useState({
    isHealthy: true,
    lastHeartbeat: new Date(),
    missedHeartbeats: 0,
    lastSuccessfulMessage: new Date(),
    reconnectAttempts: 0
  });
  const [showDetails, setShowDetails] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentHealth = signalRService.getHealth();
      setHealth(currentHealth);
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const handleManualReconnect = async () => {
    setReconnecting(true);
    try {
      await signalRService.manualReconnect();
    } finally {
      setTimeout(() => setReconnecting(false), 2000);
    }
  };

  const getStatusColor = () => {
    if (!signalRService.isConnected() || !health.isHealthy) {
      return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20';
    }
    if (health.missedHeartbeats > 0) {
      return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/20';
    }
    return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20';
  };

  const getStatusIcon = () => {
    if (!signalRService.isConnected() || !health.isHealthy) {
      return '❌';
    }
    if (health.missedHeartbeats > 0) {
      return '⚠️';
    }
    return '✅';
  };

  const getStatusText = () => {
    if (!signalRService.isConnected()) {
      return 'Disconnected';
    }
    if (!health.isHealthy) {
      return 'Unhealthy';
    }
    if (health.missedHeartbeats > 0) {
      return 'Weak Signal';
    }
    return 'Connected';
  };

  const formatTimeSince = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  // Don't show if everything is healthy
  if (signalRService.isConnected() && health.isHealthy && health.missedHeartbeats === 0 && !showDetails) {
    return (
      <button
        onClick={() => setShowDetails(true)}
        className="fixed bottom-4 right-4 w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-40"
        title="Connection Healthy"
      >
        ✓
      </button>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 rounded-xl shadow-2xl border-2 ${getStatusColor()} p-4 z-40 transition-all ${showDetails ? 'min-w-[300px]' : 'w-auto'}`}>
      <div className="flex items-start gap-3">
        <div className="text-2xl">
          {reconnecting ? (
            <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          ) : (
            getStatusIcon()
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <p className="font-bold">{getStatusText()}</p>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs underline"
            >
              {showDetails ? 'Hide' : 'Details'}
            </button>
          </div>
          
          <p className="text-xs opacity-80">
            {isAdmin ? 'Admin Dashboard' : 'Real-time Updates'}
          </p>

          {showDetails && (
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="opacity-80">Last Message:</span>
                <span className="font-medium">{formatTimeSince(health.lastSuccessfulMessage)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="opacity-80">Last Heartbeat:</span>
                <span className="font-medium">{formatTimeSince(health.lastHeartbeat)}</span>
              </div>
              
              {health.missedHeartbeats > 0 && (
                <div className="flex justify-between">
                  <span className="opacity-80">Missed Heartbeats:</span>
                  <span className="font-medium">{health.missedHeartbeats}</span>
                </div>
              )}
              
              {health.reconnectAttempts > 0 && (
                <div className="flex justify-between">
                  <span className="opacity-80">Reconnect Attempts:</span>
                  <span className="font-medium">{health.reconnectAttempts}</span>
                </div>
              )}

              <button
                onClick={handleManualReconnect}
                disabled={reconnecting}
                className="w-full mt-2 bg-current bg-opacity-10 hover:bg-opacity-20 rounded-lg py-2 font-medium transition-colors disabled:opacity-50"
              >
                {reconnecting ? 'Reconnecting...' : 'Force Reconnect'}
              </button>
            </div>
          )}
        </div>

        {!showDetails && (
          <button
            onClick={handleManualReconnect}
            disabled={reconnecting}
            className="ml-2 px-3 py-1 bg-current bg-opacity-10 hover:bg-opacity-20 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
          >
            {reconnecting ? '...' : 'Reconnect'}
          </button>
        )}
      </div>
    </div>
  );
};

export default SignalRHealthIndicator;