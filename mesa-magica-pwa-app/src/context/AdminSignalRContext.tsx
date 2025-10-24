// mesa-magica-pwa-app/src/context/AdminSignalRContext.tsx
// NEW FILE - Create this file for admin real-time updates
import React, { createContext, useContext, useEffect, useState } from 'react';
import { signalRService, OrderStatusNotification, NewOrderNotification } from '@/services/signalr.service';

interface AdminSignalRContextType {
  isConnected: boolean;
  lastOrderUpdate: OrderStatusNotification | null;
  lastNewOrder: NewOrderNotification | null;
}

const AdminSignalRContext = createContext<AdminSignalRContextType | undefined>(undefined);

export const AdminSignalRProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastOrderUpdate, setLastOrderUpdate] = useState<OrderStatusNotification | null>(null);
  const [lastNewOrder, setLastNewOrder] = useState<NewOrderNotification | null>(null);

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    
    if (!adminToken) {
      signalRService.disconnect();
      setIsConnected(false);
      return;
    }

    const connect = async () => {
      const connected = await signalRService.connect(adminToken, false);
      setIsConnected(connected);

      if (connected) {
        console.log(`[${new Date().toISOString()}] 🔌 Admin SignalR connected`);

        // Listen for order status changes (when staff updates status)
        signalRService.onOrderStatusChanged((notification) => {
          console.log(`[${new Date().toISOString()}] 🔔 Admin: Order status changed:`, notification);
          setLastOrderUpdate(notification);
          
          // Show browser notification
          if (Notification.permission === 'granted') {
            new Notification('Order Status Updated', {
              body: `Order for ${notification.tableNumber} is now ${notification.status}`,
              icon: '/logo.png'
            });
          }
        });

        // Listen for new orders (when customers place orders)
        signalRService.onNewOrderReceived((notification) => {
          console.log(`[${new Date().toISOString()}] 🔔 Admin: New order received:`, notification);
          setLastNewOrder(notification);
          
          // Show browser notification with sound for new orders
          if (Notification.permission === 'granted') {
            new Notification('New Order Received! 🍕', {
              body: `${notification.tableNumber} - ${notification.itemCount} items - $${notification.totalAmount.toFixed(2)}`,
              icon: '/logo.png',
              tag: 'new-order',
              requireInteraction: true
            });

            // Play notification sound (optional)
            try {
              const audio = new Audio('/notification.mp3');
              audio.play().catch(e => console.log('Could not play sound:', e));
            } catch (e) {
              console.log('Audio not available:', e);
            }
          }
        });
      }
    };

    connect();

    return () => {
      signalRService.offOrderStatusChanged();
      signalRService.offNewOrderReceived();
    };
  }, []);

  // Request notification permission on mount
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }
  }, []);

  return (
    <AdminSignalRContext.Provider value={{ isConnected, lastOrderUpdate, lastNewOrder }}>
      {children}
    </AdminSignalRContext.Provider>
  );
};

export const useAdminSignalR = () => {
  const context = useContext(AdminSignalRContext);
  if (!context) {
    throw new Error('useAdminSignalR must be used within AdminSignalRProvider');
  }
  return context;
};