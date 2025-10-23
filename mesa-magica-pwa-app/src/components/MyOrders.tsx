// mesa-magica-pwa-app/src/components/MyOrders.tsx
import React, { useState, useEffect } from 'react';
import { getMyOrders, OrderResponse } from '@/api/api';

const MyOrders: React.FC = () => {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  //-----------------CHANGE: Enhanced error handling for session-related failures-----------------2025-01-22----------------------
  // Detects 400/401/404 errors which indicate session is closed or invalid
  // Shows user-friendly message advising to refresh the page
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const data = await getMyOrders();
        setOrders(data);
      } catch (err: any) {
        console.error('Error fetching orders:', err);
        
        // Check if error is session-related
        // 400: Session closed/invalid
        // 401: Unauthorized/expired token
        // 404: Resource not found (session doesn't exist)
        if (err?.response?.status === 400 || 
            err?.response?.status === 401 || 
            err?.response?.status === 404) {
          setError('Unable to load orders. Your session may have expired. Please refresh the page to continue.');
        } else {
          setError(err.message || 'Failed to load orders');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);
  //-----------------END CHANGE----------------------

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'preparing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'served': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'closed': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        {/*//-----------------CHANGE: Added refresh button for user convenience-----------------2025-01-22----------------------*/}
        <button 
          onClick={() => window.location.reload()} 
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
        >
          Refresh Page
        </button>
        {/*//-----------------END CHANGE----------------------*/}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-gray-600 dark:text-neutral-400">No orders yet</p>
        <p className="text-sm text-gray-500 dark:text-neutral-500 mt-2">
          Your orders will appear here once you place them
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">My Orders</h2>
      {orders.map((order) => (
        <div
          key={order.orderId}
          className="bg-white/70 dark:bg-neutral-900/50 rounded-xl border border-zinc-300/70 dark:border-white/20 p-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-neutral-400">
                Order #{order.orderId.slice(0, 8)}
              </p>
              <p className="text-xs text-gray-500 dark:text-neutral-500 mt-1">
                {new Date(order.createdAt).toLocaleString()}
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                order.status
              )}`}
            >
              {order.status}
            </span>
          </div>

          <div className="space-y-2 mb-4">
            {order.items.map((item) => (
              <div
                key={item.orderItemId}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-gray-700 dark:text-neutral-300">
                  {item.itemName} x{item.quantity}
                </span>
                <span className="font-medium">
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-zinc-300/70 dark:border-white/20">
            <div className="flex items-center justify-between font-bold">
              <span>Total</span>
              <span className="text-lg text-orange-600">
                ${order.totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MyOrders;