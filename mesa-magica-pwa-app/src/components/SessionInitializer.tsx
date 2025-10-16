import React, { useEffect, useRef } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useSearchParams } from 'react-router-dom';
import { startSession } from '@/api/api';

const SessionInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { jwt, sessionId, setAuth, tenantSlug } = useAppContext();
  const [searchParams] = useSearchParams();
  const tableId = searchParams.get('tableId');
  const isInitializing = useRef(false);
  const lastTableId = useRef<string | null>(null);

  useEffect(() => {
    // If no tableId, clear auth and don't initialize (user is on login page)
    if (!tableId) {
      console.log(`[${new Date().toISOString()}] No tableId found - clearing session`);
      setAuth(null, null);
      lastTableId.current = null;
      return;
    }

    // If tableId changed, we need to reinitialize
    const tableChanged = lastTableId.current !== null && lastTableId.current !== tableId;
    if (tableChanged) {
      console.log(`[${new Date().toISOString()}] TableId changed from ${lastTableId.current} to ${tableId} - reinitializing session`);
      lastTableId.current = tableId;
      // Clear current auth to force re-initialization
      setAuth(null, null);
    } else {
      lastTableId.current = tableId;
    }

    // Load stored sessions from localStorage
    const storedSessions = JSON.parse(localStorage.getItem('sessions') || '{}');
    const storedSession = storedSessions[tableId];

    // Validate stored session: check if it's recent (within 24 hours)
    const isSessionValid = (session: any) => {
      if (!session || !session.jwt || !session.sessionId || !session.timestamp) {
        return false;
      }
      const sessionAge = Date.now() - new Date(session.timestamp).getTime();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      return sessionAge < maxAge;
    };

    // Use existing session if available and valid for this tableId
    if (isSessionValid(storedSession)) {
      console.log(`[${new Date().toISOString()}] Found valid stored session for tableId: ${tableId}, sessionId: ${storedSession.sessionId}`);
      
      // Set the stored session if not already set or if it's different
      if (jwt !== storedSession.jwt || sessionId !== storedSession.sessionId) {
        console.log(`[${new Date().toISOString()}] Restoring stored session`);
        setAuth(storedSession.jwt, storedSession.sessionId);
      }
      return;
    } else if (storedSession) {
      console.log(`[${new Date().toISOString()}] Stored session for tableId ${tableId} is invalid or expired - creating new session`);
      // Remove expired session
      delete storedSessions[tableId];
      localStorage.setItem('sessions', JSON.stringify(storedSessions));
    }

    // Prevent multiple simultaneous initializations
    if (isInitializing.current) {
      console.log(`[${new Date().toISOString()}] Session initialization already in progress for tableId: ${tableId}`);
      return;
    }

    isInitializing.current = true;

    const initializeSession = async () => {
      try {
        console.log(`[${new Date().toISOString()}] Starting NEW session for tenant: ${tenantSlug}, tableId: ${tableId}`);
        
        const response = await startSession({
          tableId,
          qrCodeUrl: window.location.href,
        });

        if (response.jwt && response.sessionId) {
          console.log(`[${new Date().toISOString()}] ✅ Session created successfully - SessionID: ${response.sessionId}`);
          
          // Store the new session
          setAuth(response.jwt, response.sessionId);
          
          // Save to sessions storage with timestamp
          const updatedSessions = JSON.parse(localStorage.getItem('sessions') || '{}');
          updatedSessions[tableId] = { 
            jwt: response.jwt, 
            sessionId: response.sessionId,
            tableId: tableId,
            timestamp: new Date().toISOString()
          };
          localStorage.setItem('sessions', JSON.stringify(updatedSessions));
        } else {
          console.error(`[${new Date().toISOString()}] ❌ Invalid session response:`, response);
        }
      } catch (error: any) {
        console.error(`[${new Date().toISOString()}] ❌ Failed to start session for tableId: ${tableId}`, error);
        
        // If 401 Unauthorized, clear all stored sessions
        if (error?.response?.status === 401) {
          console.log(`[${new Date().toISOString()}] Got 401 - clearing all stored sessions`);
          localStorage.removeItem('sessions');
          setAuth(null, null);
        }
      } finally {
        isInitializing.current = false;
      }
    };

    initializeSession();

    return () => {
      isInitializing.current = false;
    };
  }, [tableId, tenantSlug]); // Only depend on tableId and tenantSlug

  return <>{children}</>;
};

export default SessionInitializer;