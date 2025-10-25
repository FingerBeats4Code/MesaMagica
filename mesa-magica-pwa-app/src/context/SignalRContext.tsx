// ========================================
// FILE 1: SignalRContext.tsx (Customer)
// ========================================
// mesa-magica-pwa-app/src/context/SignalRContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { signalRService, OrderStatusNotification } from '@/services/signalr.service';
import { useAppContext } from './AppContext';
import SignalRHealthIndicator from '@/components/SignalRHealthIndicator';

interface SignalRContextType {
  isConnected: boolean;
  lastOrderUpdate: OrderStatusNotification | null;
  connectionError: string | null;
  reconnect: () => Promise<void>;
}

const SignalRContext = createContext<SignalRContextType>({
  isConnected: false,
  lastOrderUpdate: null,
  connectionError: null,
  reconnect: async () => {},
});

export const useSignalR = () => useContext(SignalRContext);

export const SignalRProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { jwt, sessionId } = useAppContext();
  const [isConnected, setIsConnected] = useState(false);
  const [lastOrderUpdate, setLastOrderUpdate] = useState<OrderStatusNotification | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const setupConnection = useCallback(async () => {
    if (!jwt || !sessionId) {
      console.log(`[${new Date().toISOString()}] ⏭️ Waiting for JWT/SessionId`);
      return;
    }

    try {
      console.log(`[${new Date().toISOString()}] 🔌 Connecting customer to SignalR...`);

      const connected = await signalRService.connect(jwt, true);
      setIsConnected(connected);

      if (connected) {
        console.log(`[${new Date().toISOString()}] ✅ Customer SignalR connected`);
        
        signalRService.onOrderStatusChanged((notification) => {
          console.log(`[${new Date().toISOString()}] 🔔 Customer received:`, notification);
          setLastOrderUpdate(notification);
          
          if (Notification.permission === 'granted' && notification.status.toLowerCase() !== 'closed') {
            new Notification('Order Update', {
              body: `Your order is now ${notification.status}`,
              icon: '/logo.png'
            });
          }
        });

        setConnectionError(null);
      } else {
        setConnectionError('Failed to connect to real-time updates');
      }
    } catch (error: any) {
      console.error(`[${new Date().toISOString()}] ❌ Connection failed:`, error);
      setConnectionError(error.message || 'Failed to connect');
      setIsConnected(false);
    }
  }, [jwt, sessionId]);

  const reconnect = useCallback(async () => {
    console.log(`[${new Date().toISOString()}] 🔄 Manual reconnect requested`);
    await setupConnection();
  }, [setupConnection]);

  useEffect(() => {
    setupConnection();

    return () => {
      console.log(`[${new Date().toISOString()}] 🔌 Cleaning up customer SignalR`);
      signalRService.offOrderStatusChanged();
    };
  }, [jwt, sessionId, setupConnection]);

  return (
    <SignalRContext.Provider value={{ isConnected, lastOrderUpdate, connectionError, reconnect }}>
      {children}
      <SignalRHealthIndicator isAdmin={false} />
    </SignalRContext.Provider>
  );
};
