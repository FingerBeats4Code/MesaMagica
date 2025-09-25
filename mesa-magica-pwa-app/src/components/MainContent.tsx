import React, { useState, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import Menu from "@/components/Menu";
import Cart from "@/components/Cart";
import Order from "@/components/Order";
import { getCategories, getMenuItems, submitOrder, addToCartBackend, removeFromCartBackend, getCart, Category, MenuItemResponse, CartItem, OrderResponse } from "@/api/api";

interface FoodCardProps {
  name: string;
  price: string;
  description: string;
  imageSrc: string;
  onAddToCart?: () => void;
  onIncrement?: () => void;
  onDecrement?: () => void;
  quantity?: number;
}

const FoodCard: React.FC<FoodCardProps> = ({ name, price, description, imageSrc, onAddToCart, onIncrement, onDecrement, quantity = 1 }) => {
  return (
    <div className="bg-white/70 dark:bg-neutral-900/50 rounded-xl border border-zinc-300/70 dark:border-white/20 overflow-hidden hover:shadow-lg transition-shadow">
      <img alt={name} src={imageSrc} className="object-cover w-full h-48" />
      <div className="p-6">
        <div className="items-start justify-between mb-2 flex">
          <p className="text-lg font-semibold">{name}</p>
          <span className="text-lg font-bold text-orange-600">{price}</span>
        </div>
        <p className="text-sm text-gray-700/80 mb-4 dark:text-neutral-300/80">{description}</p>
        <div className="items-center justify-between flex">
          <div className="items-center flex gap-2">
            <button
              type="button"
              className="border border-zinc-300/70 dark:border-white/20 flex hover:bg-neutral-100 dark:hover:bg-neutral-800 w-8 h-8 rounded-full items-center justify-center"
              onClick={onDecrement}
              disabled={quantity <= 1}
            >
              -
            </button>
            <span className="font-medium">{quantity}</span>
            <button
              type="button"
              className="border border-zinc-300/70 dark:border-white/20 flex hover:bg-neutral-100 dark:hover:bg-neutral-800 w-8 h-8 rounded-full items-center justify-center"
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

const MainContent: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemResponse[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);

  const { jwt, sessionId, tenantSlug, tableId, tenantKey } = useAppContext();

  useEffect(() => {
    const fetchData = async () => {
      if (!jwt || !sessionId || !tenantSlug || !tenantKey) return;

      try {
        const cats = await getCategories(tenantSlug, tenantKey, jwt);
        setCategories(cats);
        const items = await getMenuItems(tenantSlug, tenantKey, jwt, selectedCategory ?? undefined);
        setMenuItems(items);
        const cartData = await getCart(tenantSlug, tenantKey, jwt, sessionId);
        setCart(cartData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [jwt, sessionId, tenantSlug, tenantKey, selectedCategory]);

  const handleCategorySelect = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
  };

  const handleAddToCart = async (item: MenuItemResponse) => {
    try {
      await addToCartBackend(tenantSlug, tenantKey, jwt, sessionId, item.itemId, 1);
      const updatedCart = await getCart(tenantSlug, tenantKey, jwt, sessionId);
      setCart(updatedCart);
    } catch (error) {
      alert('Error adding to cart');
    }
  };

  const handleIncrement = async (itemId: string) => {
    try {
      await addToCartBackend(tenantSlug, tenantKey, jwt, sessionId, itemId, 1);
      const updatedCart = await getCart(tenantSlug, tenantKey, jwt, sessionId);
      setCart(updatedCart);
    } catch (error) {
      alert('Error updating cart');
    }
  };

  const handleDecrement = async (itemId: string) => {
    try {
      await removeFromCartBackend(tenantSlug, tenantKey, jwt, sessionId, itemId);
      const updatedCart = await getCart(tenantSlug, tenantKey, jwt, sessionId);
      setCart(updatedCart);
    } catch (error) {
      alert('Error updating cart');
    }
  };

  const handlePlaceOrder = async () => {
    try {
      const orderResponse = await submitOrder(jwt, tenantSlug, tenantKey, sessionId, {
        tableId,
        tenantSlug
      });
      alert(`Order submitted successfully! Order ID: ${orderResponse.orderId}`);
      setCart([]);
    } catch (error) {
      alert('Error submitting order');
    }
  };

  return (
    <main className="mx-auto px-8 relative z-20 max-w-7xl">
      <div className="text-center py-16">
        <div className="space-y-6">
          <div className="items-center px-4 py-2 rounded-full bg-white/70 text-sm dark:bg-white/10 inline-flex gap-2 border border-zinc-300/70 dark:border-white/20">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span className="text-gray-700 dark:text-neutral-300">Fresh &amp; Delicious</span>
          </div>
          <p className="text-4xl font-bold leading-tight lg:text-6xl">{tenantSlug || 'MesaMagica'} Food Menu</p>
          <p className="text-lg text-gray-700/80 mx-auto dark:text-neutral-300/80 max-w-2xl">Discover our carefully crafted menu featuring fresh ingredients and authentic flavors. Order your favorites and enjoy fast delivery.</p>
        </div>
      </div>
      <div className="lg:grid-cols-4 mb-16 grid gap-8">
        <div className="lg:col-span-1">
          <div className="sticky top-8">
            <Menu
              categories={categories}
              selectedCategory={selectedCategory}
              onCategorySelect={handleCategorySelect}
            />
            <Cart
              cart={cart}
              handleAddToCart={handleAddToCart}
              handleIncrement={handleIncrement}
              handleDecrement={handleDecrement}
            />
            <Order
              cart={cart}
              handlePlaceOrder={handlePlaceOrder}
            />
          </div>
        </div>
        <div className="lg:col-span-3">
          <div className="md:grid-cols-2 grid gap-6">
            {menuItems.map((item) => (
              <FoodCard
                key={item.itemId}
                name={item.name || 'Unnamed Item'}
                price={`$${item.price.toFixed(2)}`}
                description={item.description || 'No description available'}
                imageSrc={item.imageUrl || 'https://placehold.co/400x240/cccccc/ffffff?text=No+Image'}
                onAddToCart={() => handleAddToCart(item)}
                onIncrement={() => handleIncrement(item.itemId)}
                onDecrement={() => handleDecrement(item.itemId)}
                quantity={cart.find((cartItem) => cartItem.menuItem.itemId === item.itemId)?.quantity || 1}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
};

export default MainContent;