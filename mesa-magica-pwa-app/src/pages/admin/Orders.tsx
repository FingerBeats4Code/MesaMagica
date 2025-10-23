// mesa-magica-pwa-app/src/pages/admin/Orders.tsx
import React, { useState, useEffect } from "react";
import { getActiveOrders, updateOrderStatus, editOrder, ActiveOrderResponse } from "@/api/api";

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

  useEffect(() => {
    fetchOrders();
    // Refresh orders every 30 seconds
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await getActiveOrders();
      
      // Filter to show orders from today (including closed ones)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todaysOrders = response.filter(order => {
        const orderDate = new Date(order.createdAt);
        orderDate.setHours(0, 0, 0, 0);
        return orderDate.getTime() === today.getTime();
      });
      
      setOrders(todaysOrders);
    } catch (err: any) {
      setError(err.message || "Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId: string, status: string) => {
    try {
      await updateOrderStatus({ orderId, status });
      
      // If closing the order, we should free the table session
      if (status.toLowerCase() === "closed") {
        console.log(`[${new Date().toISOString()}] Order ${orderId} closed - table session should be freed`);
        // The backend should handle freeing the table session
        // You may want to add a notification here
      }
      
      await fetchOrders();
    } catch (err: any) {
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
      await fetchOrders();
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

  // Separate orders by status
  const activeOrders = orders.filter(o => o.status.toLowerCase() !== 'closed');
  const closedOrders = orders.filter(o => o.status.toLowerCase() === 'closed');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Manage Orders</h1>
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
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

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
      
      {/* Edit Order Modal */}
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

      {/* Payment Slip Modal */}
      {showPaymentSlip && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-xl p-8 max-w-md w-full">
            <div id="payment-slip">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2">MesaMagica</h2>
                <p className="text-sm text-gray-600 dark:text-neutral-400">Payment Receipt</p>
                <div className="border-b-2 border-dashed border-gray-300 dark:border-neutral-700 my-4"></div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-neutral-400">Order ID:</span>
                  <span className="font-medium">{selectedOrder.orderId.slice(0, 8)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-neutral-400">Table:</span>
                  <span className="font-medium">{selectedOrder.tableId}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-neutral-400">Date:</span>
                  <span className="font-medium">{new Date(selectedOrder.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-neutral-400">Status:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(selectedOrder.status)}`}>
                    {selectedOrder.status}
                  </span>
                </div>
              </div>

              <div className="border-b-2 border-dashed border-gray-300 dark:border-neutral-700 my-4"></div>

              <div className="space-y-2 mb-6">
                <h3 className="font-semibold mb-3">Items:</h3>
                {selectedOrder.items.map((item) => (
                  <div key={item.orderItemId} className="flex justify-between text-sm">
                    <span className="flex-1">{item.itemName}</span>
                    <span className="w-16 text-center">x{item.quantity}</span>
                    <span className="w-20 text-right font-medium">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-b-2 border-dashed border-gray-300 dark:border-neutral-700 my-4"></div>

              <div className="space-y-2">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Amount:</span>
                  <span className="text-orange-600">${selectedOrder.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-neutral-400">Payment Status:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    selectedOrder.paymentStatus === 'paid' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                  }`}>
                    {selectedOrder.paymentStatus || 'pending'}
                  </span>
                </div>
                {selectedOrder.status.toLowerCase() === 'closed' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-neutral-400">Order Status:</span>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">
                      CLOSED
                    </span>
                  </div>
                )}
              </div>

              <div className="border-b-2 border-dashed border-gray-300 dark:border-neutral-700 my-6"></div>

              <div className="text-center text-sm text-gray-600 dark:text-neutral-400">
                <p>Thank you for dining with us!</p>
                <p className="mt-2">Visit us again soon</p>
                {selectedOrder.status.toLowerCase() === 'closed' && (
                  <p className="mt-2 text-xs">
                    Printed on: {new Date().toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-6 print-hidden">
              <button
                onClick={handlePrint}
                className="flex-1 bg-blue-500 text-white rounded-lg py-2 hover:bg-blue-600 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Bill
              </button>
              <button
                onClick={() => setShowPaymentSlip(null)}
                className="flex-1 bg-gray-500 text-white rounded-lg py-2 hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <button
                    onClick={() => handleStartEdit(order)}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm"
                  >
                    Edit Order
                  </button>
                  <button
                    onClick={() => setShowPaymentSlip(order.orderId)}
                    className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Print Bill
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Closed Orders Section */}
      {showClosedOrders && closedOrders.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Closed Orders Today ({closedOrders.length})</h2>
          <div className="space-y-4">
            {closedOrders.map(order => (
              <div
                key={order.orderId}
                className="bg-gray-50 dark:bg-neutral-800/50 rounded-xl border border-zinc-300/70 dark:border-white/20 p-6 opacity-75"
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
                    CLOSED
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

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPaymentSlip(order.orderId)}
                    className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Print Bill
                  </button>
                  <span className="text-sm text-gray-500 dark:text-neutral-500 flex items-center">
                    (Table session ended)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #payment-slip, #payment-slip * {
            visibility: visible;
          }
          #payment-slip {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print-hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Orders;