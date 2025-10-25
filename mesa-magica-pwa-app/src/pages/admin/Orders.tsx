// mesa-magica-pwa-app/src/pages/admin/Orders.tsx
// ✅ FIXED: Proper SignalR real-time updates for admin side
import React, { useState, useEffect, useCallback } from "react";
import { getActiveOrders, updateOrderStatus, editOrder, ActiveOrderResponse } from "@/api/api";
import { useAdminSignalR } from "@/context/AdminSignalRContext";

interface EditingOrder {
  orderId: string;
  items: Array<{ itemId: string; itemName: string; quantity: number; price: number }>;
}

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<ActiveOrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingOrder, setEditingOrder] = useState<EditingOrder | null>(null);
  const [showPaymentSlip, setShowPaymentSlip] = useState<string | null>(null);
  const [showClosedOrders, setShowClosedOrders] = useState(true);
  
  // ✅ Get SignalR connection status and updates
  const { isConnected, lastOrderUpdate, lastNewOrder } = useAdminSignalR();

  // ✅ FIXED: Use useCallback with proper dependencies
  const fetchOrders = useCallback(async () => {
    try {
      console.log(`[${new Date().toISOString()}] 📋 Fetching orders...`);
      setLoading(true);
      const response = await getActiveOrders();
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todaysOrders = response.filter(order => {
        const orderDate = new Date(order.createdAt);
        orderDate.setHours(0, 0, 0, 0);
        return orderDate.getTime() === today.getTime();
      });
      
      console.log(`[${new Date().toISOString()}] ✅ Loaded ${todaysOrders.length} orders`);
      setOrders(todaysOrders);
      setError("");
    } catch (err: any) {
      console.error(`[${new Date().toISOString()}] ❌ Error fetching orders:`, err);
      setError(err.message || "Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchOrders();
    // Backup polling reduced to 60s since we have SignalR
    const interval = setInterval(fetchOrders, 60000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // ✅ FIXED: Auto-refresh when new order received via SignalR with delay
  useEffect(() => {
    if (!lastNewOrder) return;

    console.log(`[${new Date().toISOString()}] 🔔 NEW ORDER via SignalR:`, {
      orderId: lastNewOrder.orderId,
      tableNumber: lastNewOrder.tableNumber,
      itemCount: lastNewOrder.itemCount,
      totalAmount: lastNewOrder.totalAmount,
      timestamp: new Date().toISOString()
    });

    // ✅ Add delay to ensure backend has committed
    const timer = setTimeout(() => {
      console.log(`[${new Date().toISOString()}] 🔄 Refreshing orders after new order notification`);
      fetchOrders();
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [lastNewOrder, fetchOrders]);

  // ✅ FIXED: Auto-refresh when order status changed via SignalR with delay
  useEffect(() => {
    if (!lastOrderUpdate) return;

    console.log(`[${new Date().toISOString()}] 🔔 ORDER STATUS CHANGE via SignalR:`, {
      orderId: lastOrderUpdate.orderId,
      status: lastOrderUpdate.status,
      previousStatus: lastOrderUpdate.previousStatus,
      tableNumber: lastOrderUpdate.tableNumber,
      timestamp: new Date().toISOString()
    });

    // ✅ Add delay to ensure backend has committed
    const timer = setTimeout(() => {
      console.log(`[${new Date().toISOString()}] 🔄 Refreshing orders after status change`);
      fetchOrders();
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [lastOrderUpdate, fetchOrders]);

  // ✅ NEW: Debug connection status
  useEffect(() => {
    console.log(`[${new Date().toISOString()}] Admin SignalR Connection Status: ${isConnected ? 'CONNECTED ✅' : 'DISCONNECTED ❌'}`);
    
    if (!isConnected) {
      setError("Real-time updates disconnected. Reconnecting...");
    } else {
      // Clear error if it was connection-related
      if (error.includes("Real-time")) {
        setError("");
      }
    }
  }, [isConnected]);

  const handleStatusUpdate = async (orderId: string, status: string) => {
    try {
      console.log(`[${new Date().toISOString()}] 📝 Updating order ${orderId} to status: ${status}`);
      await updateOrderStatus({ orderId, status });
      
      if (status.toLowerCase() === "closed") {
        console.log(`[${new Date().toISOString()}] Order ${orderId} closed - table session should be freed`);
      }
      
      // ✅ Wait a bit before refreshing to ensure backend has committed
      setTimeout(() => {
        fetchOrders();
      }, 300);
    } catch (err: any) {
      console.error(`[${new Date().toISOString()}] ❌ Error updating order:`, err);
      setError(err.message || "Failed to update order status");
    }
  };

  const handleStartEdit = (order: ActiveOrderResponse) => {
    setEditingOrder({
      orderId: order.orderId,
      items: order.items.map(item => ({ ...item }))
    });
  };

  const handleSaveEdit = async () => {
    if (!editingOrder) return;
    
    try {
      await editOrder({
        orderId: editingOrder.orderId,
        items: editingOrder.items.map(item => ({
          itemId: item.itemId,
          quantity: item.quantity
        }))
      });
      setEditingOrder(null);
      
      // ✅ Wait before refreshing
      setTimeout(() => {
        fetchOrders();
      }, 300);
    } catch (err: any) {
      setError(err.message || "Failed to edit order");
    }
  };

  const updateItemQuantity = (itemId: string, change: number) => {
    if (!editingOrder) return;
    
    setEditingOrder({
      ...editingOrder,
      items: editingOrder.items.map(item =>
        item.itemId === itemId
          ? { ...item, quantity: Math.max(0, item.quantity + change) }
          : item
      ).filter(item => item.quantity > 0)
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'preparing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'served': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'closed': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const selectedOrder = orders.find(o => o.orderId === showPaymentSlip);
  const activeOrders = orders.filter(o => o.status.toLowerCase() !== 'closed');
  const closedOrders = orders.filter(o => o.status.toLowerCase() === 'closed');

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Manage Orders</h1>
          {/* ✅ SignalR connection indicator */}
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-xs text-gray-600 dark:text-neutral-400">
              {isConnected ? 'Real-time updates active' : 'Reconnecting...'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showClosedOrders}
              onChange={(e) => setShowClosedOrders(e.target.checked)}
              className="w-4 h-4 rounded border-zinc-300 dark:border-white/20"
            />
            <span className="text-sm">Show Closed Orders</span>
          </label>
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2 disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* ✅ NEW: Show notification banner when new order arrives */}
      {lastNewOrder && (
        <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-500 rounded-xl animate-pulse">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🔔</div>
            <div>
              <p className="font-bold text-green-900 dark:text-green-100">New Order Received!</p>
              <p className="text-sm text-green-700 dark:text-green-300">
                {lastNewOrder.tableNumber} - {lastNewOrder.itemCount} items - ${lastNewOrder.totalAmount.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ✅ FIXED: Show status update banner with safe property access */}
      {lastOrderUpdate && lastOrderUpdate.orderId && (
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="text-2xl">📝</div>
            <div>
              <p className="font-bold text-blue-900 dark:text-blue-100">Order Status Updated</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {lastOrderUpdate.tableNumber && `${lastOrderUpdate.tableNumber} - `}
                Order #{lastOrderUpdate.orderId.slice(0, 8)} is now {lastOrderUpdate.status}
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-zinc-300/70 dark:border-white/20 p-4">
          <p className="text-sm text-gray-600 dark:text-neutral-400">Total Today</p>
          <p className="text-2xl font-bold">{orders.length}</p>
        </div>
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-zinc-300/70 dark:border-white/20 p-4">
          <p className="text-sm text-gray-600 dark:text-neutral-400">Active Orders</p>
          <p className="text-2xl font-bold text-blue-600">{activeOrders.length}</p>
        </div>
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-zinc-300/70 dark:border-white/20 p-4">
          <p className="text-sm text-gray-600 dark:text-neutral-400">Closed Today</p>
          <p className="text-2xl font-bold text-gray-600">{closedOrders.length}</p>
        </div>
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-zinc-300/70 dark:border-white/20 p-4">
          <p className="text-sm text-gray-600 dark:text-neutral-400">Revenue Today</p>
          <p className="text-2xl font-bold text-green-600">
            ${orders.reduce((sum, o) => sum + o.totalAmount, 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Active Orders Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Active Orders ({activeOrders.length})</h2>
        <div className="space-y-4">
          {activeOrders.length === 0 ? (
            <div className="text-center py-8 bg-white dark:bg-neutral-900 rounded-xl border border-zinc-300/70 dark:border-white/20">
              <p className="text-gray-600 dark:text-neutral-400">No active orders</p>
            </div>
          ) : (
            activeOrders.map(order => (
              <div
                key={order.orderId}
                className="bg-white dark:bg-neutral-900 rounded-xl border border-zinc-300/70 dark:border-white/20 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold">
                      Table {order.tableId} - Order #{order.orderId.slice(0, 8)}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-neutral-400">
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  {order.items.map(item => (
                    <div key={item.orderItemId} className="flex justify-between text-sm">
                      <span>{item.itemName} x{item.quantity}</span>
                      <span>${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-zinc-300/70 dark:border-white/20 mb-4">
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>${order.totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleStatusUpdate(order.orderId, "Preparing")}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                    disabled={order.status.toLowerCase() === 'preparing'}
                  >
                    Mark Preparing
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(order.orderId, "Served")}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
                    disabled={order.status.toLowerCase() === 'served'}
                  >
                    Mark Served
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(order.orderId, "Closed")}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
                  >
                    Close Order
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Closed Orders Section (Optional) */}
      {showClosedOrders && closedOrders.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Closed Orders Today ({closedOrders.length})</h2>
          <div className="space-y-4">
            {closedOrders.map(order => (
              <div
                key={order.orderId}
                className="bg-gray-50 dark:bg-neutral-800 rounded-xl border border-zinc-300/70 dark:border-white/20 p-6 opacity-60"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">
                      Table {order.tableId} - Order #{order.orderId.slice(0, 8)}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-neutral-400">
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{order.items.length} items</span>
                  <span className="font-bold">${order.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;