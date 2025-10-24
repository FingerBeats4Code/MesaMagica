// mesa-magica-pwa-app/src/components/FoodCard.tsx
import React from "react";
import { MenuItemResponse } from "@/api/api";

interface FoodCardProps {
  item: MenuItemResponse;
  quantity: number;
  onAddToCart: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
}

const FoodCard: React.FC<FoodCardProps> = ({
  item,
  quantity,
  onAddToCart,
  onIncrement,
  onDecrement,
}) => {
  return (
    <div className="bg-white/70 dark:bg-neutral-900/50 rounded-xl border border-zinc-300/70 dark:border-white/20 overflow-hidden hover:shadow-lg transition-shadow">
      <img alt={item.name} src={item.imageUrl || "https://placehold.co/400x240/cccccc/ffffff?text=No+Image"} className="object-cover w-full h-48" />
      <div className="p-6">
        <div className="items-start justify-between mb-2 flex">
          <p className="text-lg font-semibold">{item.name}</p>
          <span className="text-lg font-bold text-orange-600">${item.price.toFixed(2)}</span>
        </div>
        <p className="text-sm text-gray-700/80 mb-4 dark:text-neutral-300/80">
          {item.description}
        </p>
        <div className="items-center justify-between flex">
          <div className="items-center flex gap-2">
            <button
              type="button"
              className="border border-zinc-300/70 dark:border-white/20 flex hover:bg-neutral-100 dark:hover:bg-neutral-800 w-8 h-8 rounded-full items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={onDecrement}
            >
              -
            </button>
            <span className="font-medium w-8 text-center">{quantity}</span>
            <button
              type="button"
              className="border border-zinc-300/70 dark:border-white/20 flex hover:bg-neutral-100 dark:hover:bg-neutral-800 w-8 h-8 rounded-full items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={onIncrement}
            >
              +
            </button>
          </div>
          <button
            type="button"
            className="hover:bg-neutral-700 dark:hover:bg-orange-600 transition-colors px-4 py-2 bg-neutral-900 dark:bg-orange-500 text-white rounded-lg text-sm font-medium"
            onClick={onAddToCart}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};

export default FoodCard;