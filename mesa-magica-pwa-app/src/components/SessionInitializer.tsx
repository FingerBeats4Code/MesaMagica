import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { startSession, getConfig } from '@/api/api';
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
        const qrCodeUrl = window.location.href;

        if (!tenantSlug || !tableId || !qrCodeUrl) {
          console.error('Missing session initialization parameters');
          setIsSessionReady(true);
          return;
        }

        // Fetch tenant key from GetCofig
        let tenantKey = import.meta.env.VITE_TENANT_API_KEY || '';
        try {
          const configResponse = await getConfig(tenantSlug);
          if (configResponse.tenantKey) {
            tenantKey = configResponse.tenantKey;
          }
        } catch (error) {
          console.error('Failed to fetch tenant key, using fallback:', error);
        }

        const sessionResponse = await startSession(qrCodeUrl, tenantSlug, tenantKey, tableId);
        if (sessionResponse.jwt && sessionResponse.sessionId) {
          setAuth(sessionResponse.jwt, sessionResponse.sessionId, tenantSlug, tableId, tenantKey);
        }
        setIsSessionReady(true);
      } catch (error) {
        console.error('Failed to initialize session:', error);
        setIsSessionReady(true); // Proceed to avoid blocking
      }
    };

    initializeSession();
  }, [jwt, sessionId, searchParams, setAuth]);

  if (!isSessionReady) {
    return <div>Loading...</div>;
  }

  return <>{children}</>;
};

export default SessionInitializer;