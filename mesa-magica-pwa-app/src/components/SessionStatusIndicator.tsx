// mesa-magica-pwa-app/src/components/SessionStatusIndicator.tsx
import React from 'react';
import { useSessionTimeout } from '@/context/SessionTimeoutContext';

/**
 * Optional component to display session timeout status in the UI
 * Shows a subtle indicator when session is getting close to expiring
 */
export const SessionStatusIndicator: React.FC = () => {
  const { remainingMinutes, lastActivity, extendSession } = useSessionTimeout();
  
  // Only show when getting close to timeout (10 minutes or less)
  if (remainingMinutes > 10) return null;
  
  const getColorClasses = () => {
    if (remainingMinutes <= 5) {
      return {
        icon: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-50 dark:bg-red-900/10',
        border: 'border-red-200 dark:border-red-800'
      };
    }
    if (remainingMinutes <= 10) {
      return {
        icon: 'text-orange-600 dark:text-orange-400',
        bg: 'bg-orange-50 dark:bg-orange-900/10',
        border: 'border-orange-200 dark:border-orange-800'
      };
    }
    return {
      icon: 'text-gray-600 dark:text-neutral-400',
      bg: 'bg-gray-50 dark:bg-gray-900/10',
      border: 'border-gray-200 dark:border-gray-800'
    };
  };
  
  const colors = getColorClasses();
  
  const formatLastActivity = () => {
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - lastActivity.getTime()) / 60000);
    
    if (diffMinutes < 1) return 'just now';
    if (diffMinutes === 1) return '1 minute ago';
    return `${diffMinutes} minutes ago`;
  };
  
  return (
    <div className={`fixed bottom-4 right-4 ${colors.bg} rounded-lg shadow-lg border ${colors.border} p-3 z-40 transition-all`}>
      <div className="flex items-start gap-3">
        <svg className={`w-5 h-5 ${colors.icon} mt-0.5`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="flex-1">
          <p className="text-xs text-gray-600 dark:text-neutral-400 mb-0.5">
            Session expires in
          </p>
          <p className={`text-sm font-semibold ${colors.icon}`}>
            {remainingMinutes} minute{remainingMinutes !== 1 ? 's' : ''}
          </p>
          <p className="text-xs text-gray-500 dark:text-neutral-500 mt-1">
            Last activity: {formatLastActivity()}
          </p>
          
          {remainingMinutes <= 5 && (
            <button
              onClick={extendSession}
              className="mt-2 text-xs font-medium text-orange-600 dark:text-orange-400 hover:underline"
            >
              Stay active →
            </button>
          )}
        </div>
        
        {remainingMinutes <= 5 && (
          <div className="flex items-center justify-center">
            <div className="relative w-10 h-10">
              <svg className="transform -rotate-90 w-10 h-10">
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  className="text-gray-200 dark:text-gray-700"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray={`${(remainingMinutes / 5) * 100} 100`}
                  className={colors.icon}
                  strokeLinecap="round"
                />
              </svg>
              <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${colors.icon}`}>
                {remainingMinutes}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionStatusIndicator;
