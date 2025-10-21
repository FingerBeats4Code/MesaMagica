// mesa-magica-pwa-app/src/components/MainContent.tsx
import React, { useState, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import Menu from "@/components/Menu";
import MyOrders from '@/components/MyOrders';
import { useSearchParams } from 'react-router-dom';
import { getCategories, getMenuItems, submitOrder, addToCartBackend, removeFromCartBackend, getCart, Category, MenuItemResponse, CartItem } from "@/api/api";

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

const FoodCard: React.FC<FoodCardProps> = ({ name, price, description, imageSrc, onAddToCart, onIncrement, onDecrement, quantity = 0 }) => {
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
              className="border border-zinc-300/70 dark:border-white/20 flex hover:bg-neutral-100 dark:hover:bg-neutral-800 w-8 h-8 rounded-full items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={onDecrement}
              disabled={quantity <= 0}
            >
              -
            </button>
            <span className="font-medium w-8 text-center">{quantity}</span>
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

interface MainContentProps {
  showCart: boolean;
  onCloseCart: () => void;
  showOrders: boolean;
  onCloseOrders: () => void;
  cart: CartItem[];
  onCartUpdate: () => void;
}

const MainContent: React.FC<MainContentProps> = ({ showCart, onCloseCart, showOrders, onCloseOrders, cart: externalCart, onCartUpdate }) => {
  const [searchParams] = useSearchParams();
  const tableId = searchParams.get('tableId') || 'default-table-id';
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemResponse[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { jwt, sessionId, tenantSlug } = useAppContext();

  // Sync with external cart
  useEffect(() => {
    setCart(externalCart);
  }, [externalCart]);

  useEffect(() => {
    console.log(`[${new Date().toISOString()}] TableId changed to: ${tableId} - resetting state`);
    setCategories([]);
    setMenuItems([]);
    setSelectedCategory(null);
    setLoading(true);
    setError(null);
  }, [tableId]);

  useEffect(() => {
    if (!jwt || !sessionId) {
      console.log(`[${new Date().toISOString()}] Waiting for session initialization...`);
      return;
    }

    const fetchInitialData = async () => {
      setLoading(true);
      setError(null);
      
      console.log(`[${new Date().toISOString()}] Fetching initial data for tenant: ${tenantSlug}, tableId: ${tableId}, sessionId: ${sessionId}`);
      
      try {
        const [cats, items] = await Promise.all([
          getCategories(),
          getMenuItems(selectedCategory ?? undefined)
        ]);
        
        setCategories(cats);
        setMenuItems(items);
        
        console.log(`[${new Date().toISOString()}] ✅ Data loaded - Categories: ${cats.length}, Items: ${items.length}`);
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
        setError('Failed to load menu. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [jwt, sessionId, selectedCategory, tenantSlug, tableId]);

  const handleCategorySelect = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
  };

  const handleAddToCart = async (item: MenuItemResponse) => {
    if (!sessionId) {
      alert('Session not initialized. Please try again.');
      return;
    }
    try {
      await addToCartBackend(sessionId, item.itemId, 1);
      onCartUpdate();
    } catch (error) {
      alert('Error adding to cart');
    }
  };

  const handleIncrement = async (itemId: string) => {
    if (!sessionId) {
      alert('Session not initialized. Please try again.');
      return;
    }
    try {
      await addToCartBackend(sessionId, itemId, 1);
      onCartUpdate();
    } catch (error) {
      alert('Error updating cart');
    }
  };

  const handleDecrement = async (itemId: string) => {
    if (!sessionId) {
      alert('Session not initialized. Please try again.');
      return;
    }
    try {
      await removeFromCartBackend(sessionId, itemId);
      onCartUpdate();
    } catch (error) {
      alert('Error updating cart');
    }
  };

  const handlePlaceOrder = async () => {
    if (!sessionId) {
      alert('Session not initialized. Please try again.');
      return;
    }
    try {
      const orderResponse = await submitOrder(sessionId, { tableId });
      alert(`Order submitted successfully! Order ID: ${orderResponse.orderId}`);
      onCartUpdate();
      onCloseCart();
    } catch (error) {
      alert('Error submitting order');
    }
  };

  if (!jwt || !sessionId) {
    return (
      <main className="mx-auto px-8 relative z-20 max-w-7xl">
        <div className="text-center py-16">
          <div className="inline-flex items-center gap-3 px-6 py-4 rounded-xl bg-white/70 dark:bg-neutral-900/50 border border-zinc-300/70 dark:border-white/20">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-lg">Initializing your session...</span>
          </div>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="mx-auto px-8 relative z-20 max-w-7xl">
        <div className="text-center py-16">
          <div className="inline-flex items-center gap-3 px-6 py-4 rounded-xl bg-white/70 dark:bg-neutral-900/50 border border-zinc-300/70 dark:border-white/20">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-lg">Loading menu...</span>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto px-8 relative z-20 max-w-7xl">
        <div className="text-center py-16">
          <div className="px-6 py-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-lg text-red-600 dark:text-red-400">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="mx-auto px-8 relative z-20 max-w-7xl">
        <div className="text-center py-16">
          <div className="space-y-6">
            <div className="items-center px-4 py-2 rounded-full bg-white/70 text-sm dark:bg-white/10 inline-flex gap-2 border border-zinc-300/70 dark:border-white/20">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-gray-700 dark:text-neutral-300">Fresh &amp; Delicious</span>
            </div>
            <p className="text-4xl font-bold leading-tight lg:text-6xl">{tenantSlug} Food Menu</p>
            <p className="text-lg text-gray-700/80 mx-auto dark:text-neutral-300/80 max-w-2xl">
              Discover our carefully crafted menu featuring fresh ingredients and authentic flavors. Order your favorites and enjoy fast delivery.
            </p>
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
            </div>
          </div>
          
          <div className="lg:col-span-3">
            {menuItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-lg text-gray-600 dark:text-neutral-400">No menu items available</p>
              </div>
            ) : (
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
                    quantity={cart.find((cartItem) => cartItem.menuItem.itemId === item.itemId)?.quantity || 0}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Cart Modal */}
      {showCart && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4" onClick={onCloseCart}>
          <div className="bg-white dark:bg-neutral-900 rounded-t-xl sm:rounded-xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-zinc-300/70 dark:border-white/20">
              <h2 className="text-2xl font-bold">Your Cart</h2>
              <button 
                onClick={onCloseCart}
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
                  <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  <p className="text-gray-600 dark:text-neutral-400">Your cart is empty</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map(({ menuItem, quantity }, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-4 bg-white/50 dark:bg-neutral-800/50 rounded-lg">
                      <img 
                        src={menuItem.imageUrl || 'https://placehold.co/80x80/cccccc/ffffff?text=No+Image'} 
                        alt={menuItem.name}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <p className="font-semibold">{menuItem.name}</p>
                        <p className="text-sm text-gray-600 dark:text-neutral-400">
                          ${menuItem.price.toFixed(2)} x {quantity}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => handleDecrement(menuItem.itemId)}
                            className="w-6 h-6 rounded-full border border-zinc-300/70 dark:border-white/20 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-700"
                          >
                            -
                          </button>
                          <span className="w-8 text-center">{quantity}</span>
                          <button
                            onClick={() => handleIncrement(menuItem.itemId)}
                            className="w-6 h-6 rounded-full border border-zinc-300/70 dark:border-white/20 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-700"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${(menuItem.price * quantity).toFixed(2)}</p>
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
                    ${cart.reduce((sum, { menuItem, quantity }) => sum + menuItem.price * quantity, 0).toFixed(2)}
                  </span>
                </div>
                <button
                  onClick={handlePlaceOrder}
                  className="w-full bg-neutral-900 dark:bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-neutral-700 dark:hover:bg-orange-600 transition-colors"
                >
                  Place Order
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Orders Modal */}
      {showOrders && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4" onClick={onCloseOrders}>
          <div className="bg-white dark:bg-neutral-900 rounded-t-xl sm:rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-zinc-300/70 dark:border-white/20">
              <h2 className="text-2xl font-bold">My Orders</h2>
              <button 
                onClick={onCloseOrders}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <MyOrders />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MainContent;