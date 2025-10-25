// mesa-magica-pwa-app/src/services/signalr.service.ts
// ✅ FIXED: Properly extract notification data from nested SignalR structure

import * as signalR from '@microsoft/signalr';

export interface OrderStatusNotification {
  orderId: string;
  status: string;
  tableNumber: string;
  totalAmount: number;
  previousStatus: string;
  timestamp: string; // ✅ Added timestamp for React state updates
  items: Array<{
    name: string;
    quantity: number;
  }>;
}

export interface NewOrderNotification {
  orderId: string;
  tableNumber: string;
  totalAmount: number;
  itemCount: number;
  timestamp: string; // ✅ Added timestamp for React state updates
  items: Array<{
    itemId: string;
    name: string;
    quantity: number;
    price: number;
  }>;
}

export interface SessionExpiredNotification {
  sessionId: string;
  tableNumber: string;
  reason: string;
  timestamp: string;
}

class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private isCustomer: boolean = false;

  async connect(token: string, isCustomer: boolean = false) {
    this.isCustomer = isCustomer;
    
    const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:80';
    const hubUrl = `${baseURL}/hubs/notifications`;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token,
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.ServerSentEvents | signalR.HttpTransportType.LongPolling
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.connection.onreconnecting((error) => {
      console.log(`[${new Date().toISOString()}] SignalR reconnecting...`, error);
    });

    this.connection.onreconnected((connectionId) => {
      console.log(`[${new Date().toISOString()}] SignalR reconnected: ${connectionId}`);
    });

    this.connection.onclose((error) => {
      console.log(`[${new Date().toISOString()}] SignalR connection closed`, error);
    });

    try {
      await this.connection.start();
      console.log(`[${new Date().toISOString()}] SignalR connected successfully`);
      return true;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] SignalR connection failed:`, error);
      return false;
    }
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
    }
  }

  // ✅ FIXED: Extract nested data from SignalR notification wrapper
  onOrderStatusChanged(callback: (notification: OrderStatusNotification) => void) {
    if (!this.connection) return;
    
    this.connection.on('OrderStatusChanged', (rawData: any) => {
      console.log(`[${new Date().toISOString()}] 📦 Raw OrderStatusChanged:`, rawData);
      
      try {
        // ✅ Extract order data from nested structure
        const order = rawData?.data?.order || rawData;
        const status = rawData?.data?.status || order?.status;
        const previousStatus = rawData?.data?.previousStatus || order?.previousStatus;
        
        // Build properly structured notification
        const notification: OrderStatusNotification = {
          orderId: order.orderId,
          status: status,
          tableNumber: order.tableNumber || order.tableId || 'Unknown',
          totalAmount: order.totalAmount || 0,
          previousStatus: previousStatus || '',
          timestamp: rawData?.timestamp || new Date().toISOString(),
          items: order.items?.map((item: any) => ({
            name: item.itemName || item.name,
            quantity: item.quantity
          })) || []
        };
        
        // Validate required fields before calling callback
        if (notification.orderId && notification.status) {
          console.log(`[${new Date().toISOString()}] ✅ Parsed OrderStatusChanged:`, notification);
          callback(notification);
        } else {
          console.error(`[${new Date().toISOString()}] ❌ Invalid OrderStatusChanged - missing required fields:`, notification);
        }
      } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ Error parsing OrderStatusChanged:`, error, rawData);
      }
    });
  }

  // ✅ FIXED: Extract nested data from SignalR notification wrapper
  onNewOrderReceived(callback: (notification: NewOrderNotification) => void) {
    if (!this.connection) return;
    
    this.connection.on('NewOrderReceived', (rawData: any) => {
      console.log(`[${new Date().toISOString()}] 📦 Raw NewOrderReceived:`, rawData);
      
      try {
        // ✅ Extract order data from nested structure
        const order = rawData?.data?.order || rawData;
        
        // Build properly structured notification
        const notification: NewOrderNotification = {
          orderId: order.orderId,
          tableNumber: order.tableNumber || order.tableId || 'Unknown',
          totalAmount: order.totalAmount || 0,
          itemCount: order.items?.length || 0,
          timestamp: rawData?.timestamp || new Date().toISOString(),
          items: order.items?.map((item: any) => ({
            itemId: item.itemId || item.menuItemId,
            name: item.itemName || item.name,
            quantity: item.quantity,
            price: item.price
          })) || []
        };
        
        // Validate required fields before calling callback
        if (notification.orderId && notification.tableNumber) {
          console.log(`[${new Date().toISOString()}] ✅ Parsed NewOrderReceived:`, notification);
          callback(notification);
        } else {
          console.error(`[${new Date().toISOString()}] ❌ Invalid NewOrderReceived - missing required fields:`, notification);
        }
      } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ Error parsing NewOrderReceived:`, error, rawData);
      }
    });
  }

  onSessionExpired(callback: (notification: SessionExpiredNotification) => void) {
    if (!this.connection) return;
    
    this.connection.on('SessionExpired', (rawData: any) => {
      console.log(`[${new Date().toISOString()}] 📦 Raw SessionExpired:`, rawData);
      
      try {
        const data = rawData?.data || rawData;
        
        const notification: SessionExpiredNotification = {
          sessionId: data.sessionId,
          tableNumber: data.tableNumber || 'Unknown',
          reason: data.reason || 'Session timeout',
          timestamp: rawData?.timestamp || new Date().toISOString()
        };
        
        if (notification.sessionId) {
          console.log(`[${new Date().toISOString()}] ✅ Parsed SessionExpired:`, notification);
          callback(notification);
        } else {
          console.error(`[${new Date().toISOString()}] ❌ Invalid SessionExpired - missing sessionId:`, notification);
        }
      } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ Error parsing SessionExpired:`, error, rawData);
      }
    });
  }

  offOrderStatusChanged() {
    if (!this.connection) return;
    this.connection.off('OrderStatusChanged');
  }

  offNewOrderReceived() {
    if (!this.connection) return;
    this.connection.off('NewOrderReceived');
  }

  offSessionExpired() {
    if (!this.connection) return;
    this.connection.off('SessionExpired');
  }

  isConnected(): boolean {
    return this.connection?.state === signalR.HubConnectionState.Connected;
  }
}

export const signalRService = new SignalRService();