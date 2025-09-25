import React from "react";
import { CartItem, MenuItemResponse } from "@/api/api";

interface CartProps {
  cart: CartItem[];
  handleAddToCart: (item: MenuItemResponse) => void;
  handleIncrement: (itemId: string) => void;
  handleDecrement: (itemId: string) => void;
}

const Cart: React.FC<CartProps> = ({ cart }) => {
  return (
    <div className="mt-8 rounded-xl bg-white/50 dark:bg-neutral-900/50 p-6 border border-zinc-300/70 dark:border-white/20">
      <p className="font-semibold text-lg mb-4">Cart Summary</p>
      <div className="space-y-3">
        {cart.length === 0 ? (
          <p className="text-sm text-gray-700 dark:text-neutral-300">Cart is empty</p>
        ) : (
          <>
            {cart.map(({ menuItem, quantity }, idx) => (
              <div key={idx} className="justify-between items-center flex">
                <span className="text-sm text-gray-700 dark:text-neutral-300">{menuItem.name} (x{quantity})</span>
                <span className="text-sm font-medium">${(menuItem.price * quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="pt-3 border-t border-zinc-300/70 dark:border-white/20">
              <div className="justify-between items-center font-semibold flex">
                <span>Total</span>
                <span>${cart.reduce((sum, { menuItem, quantity }) => sum + menuItem.price * quantity, 0).toFixed(2)}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Cart;