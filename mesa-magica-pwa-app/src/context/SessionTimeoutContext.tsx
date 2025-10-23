// mesa-magica-pwa-app/src/context/SessionTimeoutContext.tsx
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useSearchParams, useNavigate } from 'react-router-dom';

interface SessionTimeoutContextType {
  remainingMinutes: number;
  isWarningVisible: boolean;
  extendSession: () => void;
  lastActivity: Date;
}

const SessionTimeoutContext = createContext<SessionTimeoutContextType | undefined>(undefined);

// Configuration matching backend settings
const SESSION_CONFIG = {
  INACTIVE_TIMEOUT: 60, // minutes - matches backend InactiveSessionTimeout
  WARNING_THRESHOLD: 5, // Show warning 5 minutes before timeout
  CHECK_INTERVAL: 30000, // Check every 30 seconds
  JWT_EXPIRY: 60, // minutes - matches backend JWT expiry
};

export const SessionTimeoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { jwt, sessionId, setAuth } = useAppContext();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tableId = searchParams.get('tableId');
  
  const [lastActivity, setLastActivity] = useState<Date>(new Date());
  const [remainingMinutes, setRemainingMinutes] = useState(SESSION_CONFIG.INACTIVE_TIMEOUT);
  const [isWarningVisible, setIsWarningVisible] = useState(false);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track user activity
  useEffect(() => {
    if (!jwt || !sessionId || !tableId) return;

    const updateActivity = () => {
      setLastActivity(new Date());
      setIsWarningVisible(false);
      console.log(`[${new Date().toISOString()}] User activity detected - session refreshed`);
    };

    // Track various user interactions
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      window.addEventListener(event, updateActivity);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, [jwt, sessionId, tableId]);

  // Monitor session timeout
  useEffect(() => {
    if (!jwt || !sessionId || !tableId) {
      // Clear any existing timers if no active session
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      if (activityTimeoutRef.current) clearTimeout(activityTimeoutRef.current);
      return;
    }

    const checkTimeout = () => {
      const now = new Date();
      const minutesInactive = Math.floor((now.getTime() - lastActivity.getTime()) / 60000);
      const remaining = SESSION_CONFIG.INACTIVE_TIMEOUT - minutesInactive;

      setRemainingMinutes(Math.max(0, remaining));

      console.log(`[${now.toISOString()}] Session timeout check - Inactive: ${minutesInactive}m, Remaining: ${remaining}m`);

      // Show warning when approaching timeout
      if (remaining <= SESSION_CONFIG.WARNING_THRESHOLD && remaining > 0) {
        setIsWarningVisible(true);
      }

      // Session expired
      if (remaining <= 0) {
        console.log(`[${now.toISOString()}] ⏰ Session expired due to inactivity`);
        handleSessionExpired();
      }
    };

    // Start checking for timeout
    checkIntervalRef.current = setInterval(checkTimeout, SESSION_CONFIG.CHECK_INTERVAL);
    
    // Initial check
    checkTimeout();

    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, [jwt, sessionId, tableId, lastActivity]);

  // Handle JWT expiry (matches backend JWT expiry time)
  useEffect(() => {
    if (!jwt || !sessionId) return;

    // JWT expires after 60 minutes - set warning 5 minutes before
    const jwtExpiryTimeout = setTimeout(() => {
      console.log(`[${new Date().toISOString()}] ⏰ JWT approaching expiry - refreshing session`);
      handleSessionExpired();
    }, (SESSION_CONFIG.JWT_EXPIRY - SESSION_CONFIG.WARNING_THRESHOLD) * 60 * 1000);

    return () => clearTimeout(jwtExpiryTimeout);
  }, [jwt, sessionId]);

  const handleSessionExpired = () => {
    console.log(`[${new Date().toISOString()}] 🚪 Session expired - clearing session and reloading`);
    
    // Clear auth state
    setAuth(null, null);
    
    // Clear stored sessions
    const storedSessions = JSON.parse(localStorage.getItem('sessions') || '{}');
    if (tableId && storedSessions[tableId]) {
      delete storedSessions[tableId];
      localStorage.setItem('sessions', JSON.stringify(storedSessions));
    }
    
    // Force reload to trigger new session initialization
    window.location.reload();
  };

  const extendSession = () => {
    console.log(`[${new Date().toISOString()}] 🔄 Manually extending session`);
    setLastActivity(new Date());
    setIsWarningVisible(false);
  };

  return (
    <SessionTimeoutContext.Provider 
      value={{ 
        remainingMinutes, 
        isWarningVisible, 
        extendSession, 
        lastActivity 
      }}
    >
      {children}
      <SessionTimeoutWarning />
    </SessionTimeoutContext.Provider>
  );
};

// Warning modal component
const SessionTimeoutWarning: React.FC = () => {
  const context = useContext(SessionTimeoutContext);
  
  if (!context || !context.isWarningVisible) return null;

  const { remainingMinutes, extendSession } = context;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-xl p-6 max-w-md w-full shadow-2xl border-2 border-orange-500">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold">Session Expiring Soon</h2>
            <p className="text-sm text-gray-600 dark:text-neutral-400">
              Your session will expire in {remainingMinutes} minute{remainingMinutes !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg">
          <p className="text-sm text-gray-700 dark:text-neutral-300">
            You've been inactive for a while. Your session will automatically expire due to inactivity. 
            Click "Stay Active" to continue your session.
          </p>
        </div>

        <button
          onClick={extendSession}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-medium transition-colors"
        >
          Stay Active
        </button>
      </div>
    </div>
  );
};

export const useSessionTimeout = () => {
  const context = useContext(SessionTimeoutContext);
  if (!context) {
    throw new Error('useSessionTimeout must be used within SessionTimeoutProvider');
  }
  return context;
};