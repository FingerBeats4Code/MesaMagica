// mesa-magica-pwa-app/src/components/CartModal.tsx
import React from "react";
import { CartItem } from "@/api/api";

interface CartModalProps {
  isOpen: boolean;
  cart: CartItem[];
  activeOrderId: string | null;
  onClose: () => void;
  onPlaceOrder: () => void;
}

const CartModal: React.FC<CartModalProps> = ({
  isOpen,
  cart,
  activeOrderId,
  onClose,
  onPlaceOrder,
}) => {
  if (!isOpen) return null;

  const total = cart.reduce(
    (sum, { menuItem, quantity }) => sum + menuItem.price * quantity,
    0
  );

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-neutral-900 rounded-t-xl sm:rounded-xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-zinc-300/70 dark:border-white/20">
          <div>
            <h2 className="text-2xl font-bold">Your Cart</h2>
            {activeOrderId && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Adding to Order #{activeOrderId.slice(0, 8)}
              </p>
            )}
          </div>
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
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-neutral-400">Your cart is empty</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map(({ menuItem, quantity }, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-4 p-4 bg-white/50 dark:bg-neutral-800/50 rounded-lg"
                >
                  <img
                    src={menuItem.imageUrl || "https://placehold.co/80x80/cccccc/ffffff?text=No+Image"}
                    alt={menuItem.name}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <p className="font-semibold">{menuItem.name}</p>
                    <p className="text-sm text-gray-600 dark:text-neutral-400">
                      ${menuItem.price.toFixed(2)} x {quantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-6 border-t border-zinc-300/70 dark:border-white/20">
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-2xl font-bold text-orange-600">
                ${total.toFixed(2)}
              </span>
            </div>
            <button
              onClick={onPlaceOrder}
              className="w-full bg-neutral-900 dark:bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-neutral-700 dark:hover:bg-orange-600 transition-colors"
            >
              {activeOrderId
                ? `Add to Order #${activeOrderId.slice(0, 8)}`
                : "Place Order"}
            </button>
            {activeOrderId && (
              <p className="text-xs text-center text-blue-600 dark:text-blue-400 mt-2">
                These items will be added to your existing order
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CartModal;