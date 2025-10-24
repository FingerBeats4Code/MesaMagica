// mesa-magica-pwa-app/src/context/SignalRContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { signalRService, OrderStatusNotification, SessionExpiredNotification } from '@/services/signalr.service';

interface SignalRContextType {
  isConnected: boolean;
  lastOrderUpdate: OrderStatusNotification | null;
}

const SignalRContext = createContext<SignalRContextType | undefined>(undefined);

export const SignalRProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { jwt } = useAppContext();
  const [isConnected, setIsConnected] = useState(false);
  const [lastOrderUpdate, setLastOrderUpdate] = useState<OrderStatusNotification | null>(null);

  useEffect(() => {
    if (!jwt) {
      signalRService.disconnect();
      setIsConnected(false);
      return;
    }

    const connect = async () => {
      const connected = await signalRService.connect(jwt, true);
      setIsConnected(connected);

      if (connected) {
        // Customer listens to order status changes
        signalRService.onOrderStatusChanged((notification) => {
          console.log(`[${new Date().toISOString()}] 🔔 Order status updated:`, notification);
          setLastOrderUpdate(notification);
          
          // Show notification to user
          if (Notification.permission === 'granted') {
            new Notification('Order Update', {
              body: `Your order is now ${notification.status}`,
              icon: '/logo.png'
            });
          }
        });

        // Listen for session expired
        signalRService.onSessionExpired((notification: SessionExpiredNotification) => {
          console.log(`[${new Date().toISOString()}] 🔔 Session expired:`, notification);
          alert(`Your session has expired: ${notification.reason}. The page will reload.`);
          window.location.reload();
        });
      }
    };

    connect();

    return () => {
      signalRService.offOrderStatusChanged();
      signalRService.offSessionExpired();
    };
  }, [jwt]);

  return (
    <SignalRContext.Provider value={{ isConnected, lastOrderUpdate }}>
      {children}
    </SignalRContext.Provider>
  );
};

export const useSignalR = () => {
  const context = useContext(SignalRContext);
  if (!context) {
    throw new Error('useSignalR must be used within SignalRProvider');
  }
  return context;
};