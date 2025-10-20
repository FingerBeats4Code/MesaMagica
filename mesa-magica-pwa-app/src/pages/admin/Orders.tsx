// mesa-magica-pwa-app/src/pages/admin/Order.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getActiveOrders, updateOrderStatus, getPaymentDetails, editOrder } from "@/api/api";

interface Order {
  orderId: string;
  tableId: string;
  status: string;
  createdAt: string;
  totalAmount: number;
  items: Array<{
    orderItemId: string;
    itemId: string;
    itemName: string;
    quantity: number;
    price: number;
  }>;
}

interface EditingOrder {
  orderId: string;
  items: Array<{ itemId: string; itemName: string; quantity: number; price: number }>;
}

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingOrder, setEditingOrder] = useState<EditingOrder | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await getActiveOrders();
      setOrders(response);
    } catch (err: any) {
      setError(err.message || "Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId: string, status: string) => {
    try {
      await updateOrderStatus({ orderId, status });
      await fetchOrders(); // Refresh orders
    } catch (err: any) {
      setError(err.message || "Failed to update order status");
    }
  };

  const handleStartEdit = (order: Order) => {
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
      await fetchOrders(); // Refresh orders
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
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Manage Orders</h1>
      
      {editingOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-xl p-6 max-w-lg w-full">
            <h2 className="text-xl font-bold mb-4">Edit Order</h2>
            <div className="space-y-3 mb-4">
              {editingOrder.items.map(item => (
                <div key={item.itemId} className="flex items-center justify-between">
                  <span>{item.itemName}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateItemQuantity(item.itemId, -1)}
                      className="w-8 h-8 rounded-full border border-zinc-300 dark:border-white/20 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      -
                    </button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateItemQuantity(item.itemId, 1)}
                      className="w-8 h-8 rounded-full border border-zinc-300 dark:border-white/20 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                className="flex-1 bg-orange-500 text-white rounded-lg py-2 hover:bg-orange-600"
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditingOrder(null)}
                className="flex-1 bg-gray-500 text-white rounded-lg py-2 hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {orders.map(order => (
          <div
            key={order.orderId}
            className="bg-white dark:bg-neutral-900 rounded-xl border border-zinc-300/70 dark:border-white/20 p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">
                  Table {order.tableId} - Order #{order.orderId.slice(0, 8)}
                </h2>
                <p className="text-sm text-gray-600 dark:text-neutral-400">
                  {new Date(order.createdAt).toLocaleString()}
                </p>
              </div>
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 rounded-full text-sm font-medium">
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
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Mark Preparing
              </button>
              <button
                onClick={() => handleStatusUpdate(order.orderId, "Served")}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                Mark Served
              </button>
              <button
                onClick={() => handleStatusUpdate(order.orderId, "Closed")}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Close Order
              </button>
              <button
                onClick={() => handleStartEdit(order)}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                Edit Order
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Orders;