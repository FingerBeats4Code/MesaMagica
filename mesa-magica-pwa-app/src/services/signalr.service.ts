// mesa-magica-pwa-app/src/services/signalr.service.ts
import * as signalR from '@microsoft/signalr';

export interface OrderStatusNotification {
  orderId: string;
  status: string;
  tableNumber: string;
  totalAmount: number;
  previousStatus: string;
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

  onOrderStatusChanged(callback: (notification: OrderStatusNotification) => void) {
    if (!this.connection) return;
    this.connection.on('OrderStatusChanged', callback);
  }

  onNewOrderReceived(callback: (notification: NewOrderNotification) => void) {
    if (!this.connection) return;
    this.connection.on('NewOrderReceived', callback);
  }

  onSessionExpired(callback: (notification: SessionExpiredNotification) => void) {
    if (!this.connection) return;
    this.connection.on('SessionExpired', callback);
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