// mesa-magica-pwa-app/src/context/SignalRContext.tsx
// FIXED VERSION - Uses signalRService with proper data extraction

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { signalRService, OrderStatusNotification } from '@/services/signalr.service';
import { useAppContext } from './AppContext';

interface SignalRContextType {
  isConnected: boolean;
  lastOrderUpdate: OrderStatusNotification | null;
  connectionError: string | null;
}

const SignalRContext = createContext<SignalRContextType>({
  isConnected: false,
  lastOrderUpdate: null,
  connectionError: null,
});

export const useSignalR = () => useContext(SignalRContext);

export const SignalRProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { jwt, sessionId } = useAppContext();
  const [isConnected, setIsConnected] = useState(false);
  const [lastOrderUpdate, setLastOrderUpdate] = useState<OrderStatusNotification | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const setupConnection = useCallback(async () => {
    if (!jwt || !sessionId) {
      console.log(`[${new Date().toISOString()}] ⏭️ Waiting for JWT/SessionId before connecting to SignalR`);
      return;
    }

    try {
      console.log(`[${new Date().toISOString()}] 🔌 Connecting customer to SignalR...`);

      const connected = await signalRService.connect(jwt, true); // true = customer
      setIsConnected(connected);

      if (connected) {
        console.log(`[${new Date().toISOString()}] ✅ Customer SignalR connected`);
        
        // Customer listens to order status changes
        signalRService.onOrderStatusChanged((notification) => {
          console.log(`[${new Date().toISOString()}] 🔔 Customer received OrderStatusChanged:`, notification);
          
          // Notification is already validated and extracted in signalRService
          setLastOrderUpdate(notification);
          
          // Show browser notification
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
      console.error(`[${new Date().toISOString()}] ❌ SignalR connection failed:`, error);
      setConnectionError(error.message || 'Failed to connect');
      setIsConnected(false);
    }
  }, [jwt, sessionId]);

  useEffect(() => {
    setupConnection();

    return () => {
      console.log(`[${new Date().toISOString()}] 🔌 Cleaning up customer SignalR connection`);
      signalRService.offOrderStatusChanged();
    };
  }, [jwt, sessionId, setupConnection]);

  return (
    <SignalRContext.Provider value={{ isConnected, lastOrderUpdate, connectionError }}>
      {children}
    </SignalRContext.Provider>
  );
};

export default SignalRProvider;