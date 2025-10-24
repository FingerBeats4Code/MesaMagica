// mesa-magica-pwa-app/src/components/MenuGrid.tsx
import React from "react";
import { MenuItemResponse, CartItem } from "@/api/api";
import FoodCard from "./FoodCard";

interface MenuGridProps {
  menuItems: MenuItemResponse[];
  cart: CartItem[];
  onAddToCart: (item: MenuItemResponse) => void;
  onIncrement: (itemId: string) => void;
  onDecrement: (itemId: string) => void;
}

const MenuGrid: React.FC<MenuGridProps> = ({
  menuItems,
  cart,
  onAddToCart,
  onIncrement,
  onDecrement,
}) => {
  if (menuItems.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-gray-600 dark:text-neutral-400">
          No menu items available
        </p>
      </div>
    );
  }

  return (
    <div className="md:grid-cols-2 grid gap-6">
      {menuItems.map((item) => (
        <FoodCard
          key={item.itemId}
          item={item}
          quantity={
            cart.find((cartItem) => cartItem.menuItem.itemId === item.itemId)
              ?.quantity || 0
          }
          onAddToCart={() => onAddToCart(item)}
          onIncrement={() => onIncrement(item.itemId)}
          onDecrement={() => onDecrement(item.itemId)}
        />
      ))}
    </div>
  );
};

export default MenuGrid;