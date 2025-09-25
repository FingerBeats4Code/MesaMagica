import React from "react";
import { CartItem } from "@/api/api";

interface OrderProps {
  cart: CartItem[];
  handlePlaceOrder: () => void;
}

const Order: React.FC<OrderProps> = ({ cart, handlePlaceOrder }) => {
  return (
    <button
      type="button"
      className="inline-flex border border-transparent transition-colors hover:bg-neutral-700 dark:hover:bg-orange-600 w-full mt-4 items-center justify-center rounded-lg bg-neutral-900 px-4 py-3 font-medium text-neutral-100 dark:bg-orange-500"
      onClick={handlePlaceOrder}
      disabled={cart.length === 0}
    >
      Place Order
    </button>
  );
};

export default Order;