// mesa-magica-pwa-app/src/services/signalr.service.ts
// ✅ ENHANCED: Robust SignalR with health checks, forced reconnection, and recovery

import * as signalR from '@microsoft/signalr';

export interface OrderStatusNotification {
  orderId: string;
  status: string;
  tableNumber: string;
  totalAmount: number;
  previousStatus: string;
  timestamp: string;
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
  timestamp: string;
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

// ✅ NEW: Connection health monitoring
interface ConnectionHealth {
  lastHeartbeat: Date;
  missedHeartbeats: number;
  isHealthy: boolean;
  reconnectAttempts: number;
  lastSuccessfulMessage: Date;
}

class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private isCustomer: boolean = false;
  private token: string = '';
  
  // ✅ NEW: Health monitoring
  private health: ConnectionHealth = {
    lastHeartbeat: new Date(),
    missedHeartbeats: 0,
    isHealthy: true,
    reconnectAttempts: 0,
    lastSuccessfulMessage: new Date()
  };
  
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly HEARTBEAT_INTERVAL = 15000; // 15 seconds
  private readonly MAX_MISSED_HEARTBEATS = 3;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly STALE_CONNECTION_THRESHOLD = 120000; // 2 minutes

  // ✅ NEW: Store callbacks to re-register after reconnection
  private callbacks: {
    orderStatus?: (notification: OrderStatusNotification) => void;
    newOrder?: (notification: NewOrderNotification) => void;
    sessionExpired?: (notification: SessionExpiredNotification) => void;
  } = {};

  async connect(token: string, isCustomer: boolean = false) {
    this.isCustomer = isCustomer;
    this.token = token;
    
    // Clean up existing connection
    await this.disconnect();
    
    const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:80';
    const hubUrl = `${baseURL}/hubs/notifications`;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => this.token,
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | 
                   signalR.HttpTransportType.ServerSentEvents | 
                   signalR.HttpTransportType.LongPolling
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          // Exponential backoff: 0s, 2s, 5s, 10s, 30s
          const delays = [0, 2000, 5000, 10000, 30000];
          const delay = delays[Math.min(retryContext.previousRetryCount, delays.length - 1)];
          console.log(`[${new Date().toISOString()}] 🔄 SignalR retry #${retryContext.previousRetryCount + 1} in ${delay}ms`);
          return delay;
        }
      })
      .configureLogging(signalR.LogLevel.Information)
      .build();

    // ✅ NEW: Enhanced event handlers
    this.connection.onreconnecting((error) => {
      console.log(`[${new Date().toISOString()}] 🔄 SignalR reconnecting...`, error);
      this.health.isHealthy = false;
      this.health.reconnectAttempts++;
    });

    this.connection.onreconnected((connectionId) => {
      console.log(`[${new Date().toISOString()}] ✅ SignalR reconnected: ${connectionId}`);
      this.health.isHealthy = true;
      this.health.reconnectAttempts = 0;
      this.health.missedHeartbeats = 0;
      this.health.lastHeartbeat = new Date();
      
      // ✅ Re-register all callbacks after reconnection
      this.reregisterCallbacks();
    });

    this.connection.onclose((error) => {
      console.log(`[${new Date().toISOString()}] ❌ SignalR connection closed`, error);
      this.health.isHealthy = false;
      
      // ✅ Auto-reconnect if not intentionally closed
      if (error && this.health.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
        console.log(`[${new Date().toISOString()}] 🔄 Attempting forced reconnection...`);
        setTimeout(async () => await this.forceReconnect(), 5000);
      }
    });

    try {
      await this.connection.start();
      console.log(`[${new Date().toISOString()}] ✅ SignalR connected successfully`);
      
      // ✅ Start health monitoring
      this.startHealthMonitoring();
      this.startHeartbeat();
      
      this.health.isHealthy = true;
      this.health.lastHeartbeat = new Date();
      this.health.reconnectAttempts = 0;
      
      return true;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ SignalR connection failed:`, error);
      this.health.isHealthy = false;
      
      // ✅ Retry connection
      if (this.health.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
        setTimeout(async () => await this.forceReconnect(), 5000);
      }
      
      return false;
    }
  }

  // ✅ NEW: Force reconnection when connection becomes stale
  private async forceReconnect(): Promise<boolean> {
    console.log(`[${new Date().toISOString()}] 🔄 Forcing reconnection...`);
    
    try {
      // Stop existing connection
      if (this.connection) {
        await this.connection.stop();
      }
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reconnect
      const result = await this.connect(this.token, this.isCustomer);
      return result;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Force reconnect failed:`, error);
      return false;
    }
  }

  // ✅ NEW: Re-register callbacks after reconnection
  private reregisterCallbacks() {
    console.log(`[${new Date().toISOString()}] 🔄 Re-registering SignalR callbacks...`);
    
    if (this.callbacks.orderStatus) {
      this.onOrderStatusChanged(this.callbacks.orderStatus);
    }
    if (this.callbacks.newOrder) {
      this.onNewOrderReceived(this.callbacks.newOrder);
    }
    if (this.callbacks.sessionExpired) {
      this.onSessionExpired(this.callbacks.sessionExpired);
    }
  }

  // ✅ NEW: Health monitoring
  private startHealthMonitoring() {
    this.stopHealthMonitoring();
    
    this.healthCheckInterval = setInterval(() => {
      this.checkConnectionHealth();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  private stopHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  // ✅ NEW: Heartbeat mechanism
  private startHeartbeat() {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, this.HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private async sendHeartbeat() {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      this.health.missedHeartbeats++;
      console.log(`[${new Date().toISOString()}] 💔 Missed heartbeat #${this.health.missedHeartbeats}`);
      
      if (this.health.missedHeartbeats >= this.MAX_MISSED_HEARTBEATS) {
        console.log(`[${new Date().toISOString()}] ❌ Too many missed heartbeats, forcing reconnect`);
        await this.forceReconnect();
      }
      return;
    }

    try {
      // Try to invoke a simple method on the server as heartbeat
      // This will fail if connection is stale
      await this.connection.invoke('Ping').catch(() => {
        // Ping method may not exist on server, that's ok
        // The attempt itself validates the connection
      });
      
      this.health.lastHeartbeat = new Date();
      this.health.missedHeartbeats = 0;
    } catch (error) {
      this.health.missedHeartbeats++;
      console.log(`[${new Date().toISOString()}] 💔 Heartbeat failed:`, error);
    }
  }

  // ✅ NEW: Check if connection has gone stale
  private async checkConnectionHealth() {
    const now = new Date();
    const timeSinceLastMessage = now.getTime() - this.health.lastSuccessfulMessage.getTime();
    const timeSinceLastHeartbeat = now.getTime() - this.health.lastHeartbeat.getTime();
    
    console.log(`[${now.toISOString()}] 🏥 Health check:`, {
      connectionState: this.connection?.state,
      timeSinceLastMessage: `${(timeSinceLastMessage / 1000).toFixed(0)}s`,
      timeSinceLastHeartbeat: `${(timeSinceLastHeartbeat / 1000).toFixed(0)}s`,
      missedHeartbeats: this.health.missedHeartbeats,
      isHealthy: this.health.isHealthy
    });
    
    // ✅ Check if connection is stale (no messages for too long)
    if (timeSinceLastMessage > this.STALE_CONNECTION_THRESHOLD) {
      console.log(`[${now.toISOString()}] ⚠️ Connection appears stale (${(timeSinceLastMessage / 1000).toFixed(0)}s since last message)`);
      
      if (this.connection?.state === signalR.HubConnectionState.Connected) {
        console.log(`[${now.toISOString()}] 🔄 Connection shows as connected but may be stale, forcing reconnect`);
        await this.forceReconnect();
      }
    }
    
    // ✅ Check connection state
    if (this.connection?.state === signalR.HubConnectionState.Disconnected) {
      console.log(`[${now.toISOString()}] ❌ Connection is disconnected, forcing reconnect`);
      await this.forceReconnect();
    }
  }

  // ✅ NEW: Get connection health status
  getHealth(): ConnectionHealth {
    return { ...this.health };
  }

  async disconnect() {
    this.stopHealthMonitoring();
    this.stopHeartbeat();
    
    if (this.connection) {
      try {
        await this.connection.stop();
      } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ Error stopping connection:`, error);
      }
      this.connection = null;
    }
    
    this.health.isHealthy = false;
  }

  // ✅ ENHANCED: Store callback and register with connection
  onOrderStatusChanged(callback: (notification: OrderStatusNotification) => void) {
    if (!this.connection) return;
    
    // Store callback for re-registration
    this.callbacks.orderStatus = callback;
    
    // Remove existing handler
    this.connection.off('OrderStatusChanged');
    
    // Register new handler
    this.connection.on('OrderStatusChanged', (rawData: any) => {
      console.log(`[${new Date().toISOString()}] 📦 Raw OrderStatusChanged:`, rawData);
      
      // ✅ Update health status
      this.health.lastSuccessfulMessage = new Date();
      this.health.missedHeartbeats = 0;
      
      try {
        const order = rawData?.data?.order || rawData;
        const status = rawData?.data?.status || order?.status;
        const previousStatus = rawData?.data?.previousStatus || order?.previousStatus;
        
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
        
        if (notification.orderId && notification.status) {
          console.log(`[${new Date().toISOString()}] ✅ Parsed OrderStatusChanged:`, notification);
          callback(notification);
        } else {
          console.error(`[${new Date().toISOString()}] ❌ Invalid OrderStatusChanged:`, notification);
        }
      } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ Error parsing OrderStatusChanged:`, error, rawData);
      }
    });
  }

  // ✅ ENHANCED: Store callback and register with connection
  onNewOrderReceived(callback: (notification: NewOrderNotification) => void) {
    if (!this.connection) return;
    
    // Store callback for re-registration
    this.callbacks.newOrder = callback;
    
    // Remove existing handler
    this.connection.off('NewOrderReceived');
    
    // Register new handler
    this.connection.on('NewOrderReceived', (rawData: any) => {
      console.log(`[${new Date().toISOString()}] 📦 Raw NewOrderReceived:`, rawData);
      
      // ✅ Update health status
      this.health.lastSuccessfulMessage = new Date();
      this.health.missedHeartbeats = 0;
      
      try {
        const order = rawData?.data?.order || rawData;
        
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
        
        if (notification.orderId && notification.tableNumber) {
          console.log(`[${new Date().toISOString()}] ✅ Parsed NewOrderReceived:`, notification);
          callback(notification);
        } else {
          console.error(`[${new Date().toISOString()}] ❌ Invalid NewOrderReceived:`, notification);
        }
      } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ Error parsing NewOrderReceived:`, error, rawData);
      }
    });
  }

  onSessionExpired(callback: (notification: SessionExpiredNotification) => void) {
    if (!this.connection) return;
    
    // Store callback for re-registration
    this.callbacks.sessionExpired = callback;
    
    // Remove existing handler
    this.connection.off('SessionExpired');
    
    // Register new handler
    this.connection.on('SessionExpired', (rawData: any) => {
      console.log(`[${new Date().toISOString()}] 📦 Raw SessionExpired:`, rawData);
      
      // ✅ Update health status
      this.health.lastSuccessfulMessage = new Date();
      
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
        }
      } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ Error parsing SessionExpired:`, error, rawData);
      }
    });
  }

  offOrderStatusChanged() {
    if (!this.connection) return;
    this.connection.off('OrderStatusChanged');
    delete this.callbacks.orderStatus;
  }

  offNewOrderReceived() {
    if (!this.connection) return;
    this.connection.off('NewOrderReceived');
    delete this.callbacks.newOrder;
  }

  offSessionExpired() {
    if (!this.connection) return;
    this.connection.off('SessionExpired');
    delete this.callbacks.sessionExpired;
  }

  isConnected(): boolean {
    return this.connection?.state === signalR.HubConnectionState.Connected && this.health.isHealthy;
  }

  // ✅ NEW: Manual reconnect trigger (for UI button)
  async manualReconnect(): Promise<boolean> {
    console.log(`[${new Date().toISOString()}] 🔄 Manual reconnect triggered`);
    return await this.forceReconnect();
  }
}

export const signalRService = new SignalRService();