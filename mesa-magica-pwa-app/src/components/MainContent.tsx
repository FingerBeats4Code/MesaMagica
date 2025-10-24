// mesa-magica-pwa-app/src/components/MainContent.tsx
import React, { useState, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import Menu from "@/components/Menu";
import { useSearchParams } from 'react-router-dom';
import { getCategories, getMenuItems, submitOrder, addToCartBackend, removeFromCartBackend, getCart, getMyOrders, getPreparingItems, Category, MenuItemResponse, CartItem, OrderResponse } from "@/api/api";

interface FoodCardProps {
  name: string;
  price: string;
  description: string;
  imageSrc: string;
  onAddToCart?: () => void;
  onIncrement?: () => void;
  onDecrement?: () => void;
  quantity?: number;
  disabled?: boolean;
  canDecrement?: boolean;
}

const FoodCard: React.FC<FoodCardProps> = ({ 
  name, 
  price, 
  description, 
  imageSrc, 
  onAddToCart, 
  onIncrement, 
  onDecrement, 
  quantity = 0, 
  disabled = false,
  canDecrement = true 
}) => {
  return (
    <div className={`bg-white/70 dark:bg-neutral-900/50 rounded-xl border border-zinc-300/70 dark:border-white/20 overflow-hidden hover:shadow-lg transition-shadow`}>
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
              disabled={quantity <= 0 || !canDecrement}
              title={!canDecrement && quantity > 0 ? "Item is being prepared and cannot be removed" : ""}
            >
              -
            </button>
            <span className="font-medium w-8 text-center">{quantity}</span>
            <button
              type="button"
              className="border border-zinc-300/70 dark:border-white/20 flex hover:bg-neutral-100 dark:hover:bg-neutral-800 w-8 h-8 rounded-full items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={onIncrement}
              disabled={disabled}
            >
              +
            </button>
          </div>
          <button
            type="button"
            className="hover:bg-neutral-700 dark:hover:bg-orange-600 transition-colors px-4 py-2 bg-neutral-900 dark:bg-orange-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onAddToCart}
            disabled={disabled}
          >
            Add to Cart
          </button>
        </div>
        {!canDecrement && quantity > 0 && (
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 text-center">
            ⏳ This item is being prepared
          </p>
        )}
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
  const [myOrders, setMyOrders] = useState<OrderResponse[]>([]);
  const [activeOrders, setActiveOrders] = useState<OrderResponse[]>([]);
  const [preparingItemIds, setPreparingItemIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderRefreshTrigger, setOrderRefreshTrigger] = useState(0);
  const { jwt, sessionId, tenantSlug } = useAppContext();

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
        const [cats, items, orders] = await Promise.all([
          getCategories(),
          getMenuItems(selectedCategory ?? undefined),
          getMyOrders().catch(() => [])
        ]);
        
        setCategories(cats);
        setMenuItems(items);
        setMyOrders(orders);

        // Get active orders (non-closed)
        const active = orders.filter(o => o.status.toLowerCase() !== 'closed');
        setActiveOrders(active);

        // Fetch preparing items if there's a preparing order
        const preparingOrder = active.find(o => o.status.toLowerCase() === 'preparing');
        if (preparingOrder) {
          try {
            const { preparingItemIds } = await getPreparingItems(preparingOrder.orderId);
            setPreparingItemIds(new Set(preparingItemIds));
            console.log(`[${new Date().toISOString()}] Found ${preparingItemIds.length} items being prepared`);
          } catch (err) {
            console.warn('Could not fetch preparing items:', err);
            setPreparingItemIds(new Set());
          }
        } else {
          setPreparingItemIds(new Set());
        }
        
        console.log(`[${new Date().toISOString()}] ✅ Data loaded - Categories: ${cats.length}, Items: ${items.length}, Active Orders: ${active.length}`);
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
        setError('Failed to load menu. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [jwt, sessionId, selectedCategory, tenantSlug, tableId, orderRefreshTrigger]);

  const handleCategorySelect = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
  };

  // Check if an item can be removed from cart
  const canRemoveItem = (itemId: string): boolean => {
    // If item is in preparing order, it cannot be removed
    return !preparingItemIds.has(itemId);
  };

  const handleAddToCart = async (item: MenuItemResponse) => {
    if (!sessionId) {
      alert('Session not initialized. Please try again.');
      return;
    }

    try {
      await addToCartBackend(sessionId, item.itemId, 1);
      onCartUpdate();
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      
      if (error?.response?.status === 400 || error?.response?.status === 401) {
        alert('Your session has expired. The page will reload to create a new session.');
        window.location.reload();
      } else {
        alert('Error adding to cart. Please try again.');
      }
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
    } catch (error: any) {
      console.error('Error updating cart:', error);
      
      if (error?.response?.status === 400 || error?.response?.status === 401) {
        alert('Your session has expired. The page will reload to create a new session.');
        window.location.reload();
      } else {
        alert('Error updating cart. Please try again.');
      }
    }
  };

  const handleDecrement = async (itemId: string) => {
    if (!sessionId) {
      alert('Session not initialized. Please try again.');
      return;
    }

    // Check if item is being prepared
    if (!canRemoveItem(itemId)) {
      alert('This item is being prepared and cannot be removed from your order.');
      return;
    }

    try {
      await removeFromCartBackend(sessionId, itemId);
      onCartUpdate();
    } catch (error: any) {
      console.error('Error updating cart:', error);
      
      if (error?.response?.status === 400 || error?.response?.status === 401) {
        alert('Your session has expired. The page will reload to create a new session.');
        window.location.reload();
      } else {
        alert('Error updating cart. Please try again.');
      }
    }
  };

  const handlePlaceOrder = async () => {
    if (!sessionId) {
      alert('Session not initialized. Please try again.');
      return;
    }

    try {
      console.log(`[${new Date().toISOString()}] Submitting order for session ${sessionId}`);
      
      // Submit the order (backend will update existing order if there is one)
      const orderResponse = await submitOrder(sessionId, { tableId });
      
      console.log(`[${new Date().toISOString()}] ✅ Order ${activeOrders.length > 0 ? 'updated' : 'submitted'} successfully: ${orderResponse.orderId}`);
      
      // Show appropriate success message
      const message = activeOrders.length > 0 
        ? `Order updated successfully! Order ID: ${orderResponse.orderId}\n\nYour new items have been added to the kitchen.`
        : `Order submitted successfully! Order ID: ${orderResponse.orderId}`;
      
      alert(message);
      
      // Close the cart modal
      onCloseCart();
      
      // Trigger order refresh by incrementing counter
      setOrderRefreshTrigger(prev => prev + 1);
      
      // Try to refresh cart and orders
      try {
        await onCartUpdate();
        const orders = await getMyOrders();
        setMyOrders(orders);
        
        const active = orders.filter(o => o.status.toLowerCase() !== 'closed');
        setActiveOrders(active);
        
        // Refresh preparing items
        const preparingOrder = active.find(o => o.status.toLowerCase() === 'preparing');
        if (preparingOrder) {
          const { preparingItemIds } = await getPreparingItems(preparingOrder.orderId);
          setPreparingItemIds(new Set(preparingItemIds));
        } else {
          setPreparingItemIds(new Set());
        }
        
        console.log(`[${new Date().toISOString()}] ✅ Cart and orders refreshed`);
      } catch (refreshError: any) {
        console.log(`[${new Date().toISOString()}] ℹ️ Could not refresh cart/orders:`, refreshError?.response?.status);
      }
      
    } catch (error: any) {
      console.error(`[${new Date().toISOString()}] ❌ Error submitting order:`, error);
      
      if (error?.response?.status === 400 || error?.response?.status === 401) {
        alert('Your session has expired. The page will reload to create a new session.');
        window.location.reload();
      } else {
        alert('Error submitting order. Please try again.');
      }
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
        {/* Active Order Info Banner */}
        {activeOrders.length > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="font-semibold text-blue-900 dark:text-blue-100">Active Order in Progress</p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  You can continue adding items to your order. Items marked as "Preparing" cannot be removed. 
                  Click "Place Order" to send new items to the kitchen.
                </p>
              </div>
            </div>
          </div>
        )}

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
                    disabled={false}
                    canDecrement={canRemoveItem(item.itemId)}
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
                  {cart.map(({ menuItem, quantity }, idx) => {
                    const isBeingPrepared = preparingItemIds.has(menuItem.itemId);
                    
                    return (
                      <div key={idx} className="flex items-center gap-4 p-4 bg-white/50 dark:bg-neutral-800/50 rounded-lg">
                        <img 
                          src={menuItem.imageUrl || 'https://placehold.co/80x80/cccccc/ffffff?text=No+Image'} 
                          alt={menuItem.name}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold">{menuItem.name}</p>
                            {isBeingPrepared && (
                              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 text-xs rounded-full flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Preparing
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-neutral-400">
                            ${menuItem.price.toFixed(2)} x {quantity}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => handleDecrement(menuItem.itemId)}
                              className="w-6 h-6 rounded-full border border-zinc-300/70 dark:border-white/20 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={isBeingPrepared}
                              title={isBeingPrepared ? "Item is being prepared" : ""}
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-medium">{quantity}</span>
                            <button
                              onClick={() => handleIncrement(menuItem.itemId)}
                              className="w-6 h-6 rounded-full border border-zinc-300/70 dark:border-white/20 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-700"
                            >
                              +
                            </button>
                          </div>
                          {isBeingPrepared && (
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                              Cannot remove - being prepared in kitchen
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold">${(menuItem.price * quantity).toFixed(2)}</p>
                        </div>
                      </div>
                    );
                  })}
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
                  {activeOrders.length > 0 ? 'Update Order' : 'Place Order'}
                </button>
                {activeOrders.length > 0 && (
                  <p className="text-xs text-center text-blue-600 dark:text-blue-400 mt-2">
                    New items will be added to your existing order
                  </p>
                )}
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
              {myOrders.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-lg text-gray-600 dark:text-neutral-400">No orders yet</p>
                  <p className="text-sm text-gray-500 dark:text-neutral-500 mt-2">
                    Your orders will appear here once you place them
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myOrders.map((order) => (
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
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            order.status.toLowerCase() === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                            order.status.toLowerCase() === 'preparing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                            order.status.toLowerCase() === 'served' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>

                      <div className="space-y-2 mb-4">
                        {order.items.map((item) => (
                          <div
                            key={item.orderItemId}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-gray-700 dark:text-neutral-300">
                              {item.itemName} x{item.quantity}
                            </span>
                            <span className="font-medium">
                              ${(item.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-4 border-t border-zinc-300/70 dark:border-white/20">
                        <div className="flex items-center justify-between font-bold">
                          <span>Total</span>
                          <span className="text-lg text-orange-600">
                            ${order.totalAmount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
export default MainContent;