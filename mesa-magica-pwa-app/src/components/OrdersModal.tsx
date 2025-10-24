// mesa-magica-pwa-app/src/components/OrdersModal.tsx
import React from "react";
import { OrderResponse } from "@/api/api";

interface OrdersModalProps {
  isOpen: boolean;
  orders: OrderResponse[];
  activeOrderId: string | null;
  onClose: () => void;
}

const OrdersModal: React.FC<OrdersModalProps> = ({
  isOpen,
  orders,
  activeOrderId,
  onClose,
}) => {
  if (!isOpen) return null;

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "preparing":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "served":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-neutral-900 rounded-t-xl sm:rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-zinc-300/70 dark:border-white/20">
          <h2 className="text-2xl font-bold">My Orders</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg text-gray-600 dark:text-neutral-400">No orders yet</p>
            </div>
          ) : (
            <div className="space-y-4">
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
                      {order.updatedAt !== order.createdAt && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Updated: {new Date(order.updatedAt).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                      {activeOrderId === order.orderId && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                          ⚡ Active
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    {order.items.map((item) => (
                      <div key={item.orderItemId} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 dark:text-neutral-300">
                          {item.itemName} x{item.quantity}
                        </span>
                        <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-zinc-300/70 dark:border-white/20">
                    <div className="flex items-center justify-between font-bold mb-3">
                      <span>Total</span>
                      <span className="text-lg text-orange-600">${order.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrdersModal;