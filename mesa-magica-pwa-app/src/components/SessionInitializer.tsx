import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { startSession } from '@/api/api';
import { useAppContext } from '@/context/AppContext';

interface SessionInitializerProps {
  children: React.ReactNode;
}

const SessionInitializer: React.FC<SessionInitializerProps> = ({ children }) => {
  const { jwt, sessionId, setAuth } = useAppContext();
  const [searchParams] = useSearchParams();
  const [isSessionReady, setIsSessionReady] = useState(false);

  useEffect(() => {
    const initializeSession = async () => {
      if (jwt && sessionId) {
        setIsSessionReady(true);
        return;
      }

      try {
        const tenantSlug = searchParams.get('tenantSlug') || import.meta.env.VITE_TENANT_SLUG || '';
        const tableId = searchParams.get('tableId') || 'default-table-id';
        const apiKey = import.meta.env.VITE_TENANT_API_KEY || '';
        const qrCodeUrl = window.location.href;

        const sessionResponse = await startSession(qrCodeUrl, tenantSlug, apiKey, tableId);
        if (sessionResponse.jwt && sessionResponse.sessionId) {
          setAuth(sessionResponse.jwt, sessionResponse.sessionId, tenantSlug, tableId);
        }
        setIsSessionReady(true);
      } catch (error) {
        console.error('Failed to initialize session:', error);
        setIsSessionReady(true); // Proceed to avoid blocking, handle errors as needed
      }
    };

    initializeSession();
  }, [jwt, sessionId, searchParams, setAuth]);

  if (!isSessionReady) {
    return <div>Loading...</div>; // Replace with your loading component
  }

  return <>{children}</>;
};

export default SessionInitializer;