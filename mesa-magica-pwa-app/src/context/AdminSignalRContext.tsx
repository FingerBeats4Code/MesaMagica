// ========================================
// FILE 2: AdminSignalRContext.tsx (Admin)
// ========================================
// mesa-magica-pwa-app/src/context/AdminSignalRContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { signalRService, OrderStatusNotification, NewOrderNotification } from '@/services/signalr.service';
import SignalRHealthIndicator from '@/components/SignalRHealthIndicator';

interface AdminSignalRContextType {
  isConnected: boolean;
  lastOrderUpdate: OrderStatusNotification | null;
  lastNewOrder: NewOrderNotification | null;
}

const AdminSignalRContext = createContext<AdminSignalRContextType | undefined>(undefined);

export const AdminSignalRProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const adminToken = localStorage.getItem('adminToken');
  const [isConnected, setIsConnected] = useState(false);
  const [lastOrderUpdate, setLastOrderUpdate] = useState<OrderStatusNotification | null>(null);
  const [lastNewOrder, setLastNewOrder] = useState<NewOrderNotification | null>(null);

  useEffect(() => {
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

        signalRService.onOrderStatusChanged((notification) => {
          console.log(`[${new Date().toISOString()}] 🔔 Admin: Order status updated:`, notification);
          setLastOrderUpdate(notification);
          
          if (Notification.permission === 'granted') {
            new Notification('Order Status Updated', {
              body: `Order #${notification.orderId.slice(0, 8)} is now ${notification.status}`,
              icon: '/logo.png'
            });
          }
        });

        signalRService.onNewOrderReceived((notification) => {
          console.log(`[${new Date().toISOString()}] 🔔 Admin: New order received:`, notification);
          
          if (notification && notification.orderId && notification.tableNumber) {
            setLastNewOrder({
              ...notification,
              timestamp: notification.timestamp || new Date().toISOString()
            });
            
            if (Notification.permission === 'granted') {
              new Notification('New Order Received! 🔔', {
                body: `${notification.tableNumber}: ${notification.itemCount} items - ${notification.totalAmount.toFixed(2)}`,
                icon: '/logo.png',
                requireInteraction: true
              });
            }
            
            const audio = new Audio('/notification-sound.mp3');
            audio.play().catch(e => console.log('Could not play sound:', e));
          }
        });
      }
    };

    connect();

    return () => {
      signalRService.offOrderStatusChanged();
      signalRService.offNewOrderReceived();
    };
  }, [adminToken]);

  return (
    <AdminSignalRContext.Provider value={{ isConnected, lastOrderUpdate, lastNewOrder }}>
      {children}
      <SignalRHealthIndicator isAdmin={true} />
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