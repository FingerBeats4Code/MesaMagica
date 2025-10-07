import React, { useEffect, useRef } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useSearchParams } from 'react-router-dom';
import { startSession } from '@/api/api';

const SessionInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { jwt, sessionId, setAuth } = useAppContext();
  const [searchParams] = useSearchParams();
  const tableId = searchParams.get('tableId') || 'default-table-id';
  const isInitializing = useRef(false);

  useEffect(() => {
    // Load stored sessions from localStorage
    const storedSessions = JSON.parse(localStorage.getItem('sessions') || '{}');
    const storedSession = storedSessions[tableId];

    // Use existing session if available for this tableId
    if (storedSession && storedSession.jwt && storedSession.sessionId && storedSession.sessionId === sessionId && storedSession.jwt === jwt) {
      console.log(`[${new Date().toISOString()}] Reusing existing session for tableId: ${tableId}, sessionId: ${storedSession.sessionId}`);
      return;
    }

    // Prevent multiple initializations
    if (isInitializing.current) {
      console.log(`[${new Date().toISOString()}] Session initialization already in progress for tableId: ${tableId}`);
      return;
    }

    isInitializing.current = true;

    const initializeSession = async () => {
      try {
        console.log(`[${new Date().toISOString()}] Starting new session for tableId: ${tableId}`);
        const response = await startSession({
          tableId,
          qrCodeUrl: window.location.href,
        });
        // Store the new session
        setAuth(response.jwt, response.sessionId);
        storedSessions[tableId] = { jwt: response.jwt, sessionId: response.sessionId };
        localStorage.setItem('sessions', JSON.stringify(storedSessions));
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Failed to start session for tableId: ${tableId}`, error);
      } finally {
        isInitializing.current = false;
      }
    };

    initializeSession();

    return () => {
      isInitializing.current = false; // Reset on cleanup
    };
  }, [tableId, setAuth, jwt, sessionId]);

  return <>{children}</>;
};

export default SessionInitializer;