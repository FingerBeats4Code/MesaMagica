// mesa-magica-pwa-app/src/components/MainContent.tsx
// UPDATED VERSION - Fixed SignalR update handler and feedback triggering logic

import React, { useState, useEffect, useCallback } from "react";
import { useAppContext } from "@/context/AppContext";
import { useSearchParams } from "react-router-dom";
import { useSignalR } from "@/context/SignalRContext";
import Menu from "@/components/Menu";
import MenuGrid from "@/components/MenuGrid";
import CartModal from "@/components/CartModal";
import OrdersModal from "@/components/OrdersModal";
import ActiveOrderBanner from "@/components/ActiveOrderBanner";
import FeedbackModal from "@/components/FeedbackModal";
import {
  getCategories,
  getMenuItems,
  submitOrder,
  addToCartBackend,
  removeFromCartBackend,
  getMyOrders,
  checkFeedbackSubmitted,
  Category,
  MenuItemResponse,
  CartItem,
  OrderResponse,
} from "@/api/api";

interface MainContentProps {
  showCart: boolean;
  onCloseCart: () => void;
  showOrders: boolean;
  onCloseOrders: () => void;
  cart: CartItem[];
  onCartUpdate: () => void;
}

const MainContent: React.FC<MainContentProps> = ({
  showCart,
  onCloseCart,
  showOrders,
  onCloseOrders,
  cart: externalCart,
  onCartUpdate,
}) => {
  const [searchParams] = useSearchParams();
  const tableId = searchParams.get("tableId") || "default-table-id";
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemResponse[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [myOrders, setMyOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeOrderInfo, setActiveOrderInfo] = useState<{
    orderId: string;
    status: string;
    itemCount: number;
  } | null>(null);
  
  // Feedback Modal State
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackOrderId, setFeedbackOrderId] = useState<string | null>(null);
  const [feedbackOrderTotal, setFeedbackOrderTotal] = useState(0);
  const [lastClosedOrderId, setLastClosedOrderId] = useState<string | null>(null);

  const { jwt, sessionId, tenantSlug } = useAppContext();
  const { lastOrderUpdate } = useSignalR();

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

  // ✅ Basic order fetching (updates UI without triggering feedback)
  const fetchOrdersBasic = useCallback(async () => {
    try {
      console.log(`[${new Date().toISOString()}] 📡 Fetching orders (basic)...`);
      const orders = await getMyOrders();
      console.log(`[${new Date().toISOString()}] 📦 Received ${orders.length} orders`);
      setMyOrders(orders);

      // Update active order info for banner
      const activeOrder = orders.find((o) => o.status && o.status.toLowerCase() !== "closed");
      if (activeOrder) {
        setActiveOrderInfo({
          orderId: activeOrder.orderId,
          status: activeOrder.status,
          itemCount: activeOrder.items.length,
        });
        console.log(`[${new Date().toISOString()}] ✅ Active order updated: ${activeOrder.orderId}, Status: ${activeOrder.status}`);
      } else {
        setActiveOrderInfo(null);
        console.log(`[${new Date().toISOString()}] ℹ️ No active orders`);
      }
      
      return orders;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Failed to fetch orders:`, error);
      throw error;
    }
  }, []);

  // ✅ Check for feedback opportunity (separate function)
  const checkAndShowFeedback = useCallback(async (orders: OrderResponse[]) => {
    try {
      // Check for closed orders
      const closedOrders = orders.filter((o) => o.status && o.status.toLowerCase() === "closed");
      
      if (closedOrders.length > 0) {
        // Sort by createdAt to get the most recent closed order
        const sortedClosedOrders = closedOrders.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        const latestClosedOrder = sortedClosedOrders[0];
        
        // Only trigger feedback for NEW closed orders
        if (latestClosedOrder.orderId !== lastClosedOrderId) {
          console.log(`[${new Date().toISOString()}] 🔒 New closed order detected: ${latestClosedOrder.orderId}`);
          setLastClosedOrderId(latestClosedOrder.orderId);
          
          // Check if feedback was already submitted
          const feedbackSubmitted = await checkFeedbackSubmitted(latestClosedOrder.orderId);
          
          if (!feedbackSubmitted) {
            console.log(`[${new Date().toISOString()}] 📋 Showing feedback modal for order: ${latestClosedOrder.orderId}`);
            setFeedbackOrderId(latestClosedOrder.orderId);
            setFeedbackOrderTotal(latestClosedOrder.totalAmount);
            setShowFeedback(true);
          } else {
            console.log(`[${new Date().toISOString()}] ✓ Feedback already submitted for order: ${latestClosedOrder.orderId}`);
          }
        }
      }
    } catch (error) {
      console.error("Failed to check feedback status:", error);
    }
  }, [lastClosedOrderId]);

  // ✅ Fetch orders WITH feedback check (for initial load and closed order detection)
  const fetchOrdersWithFeedback = useCallback(async () => {
    try {
      const orders = await getMyOrders();
      setMyOrders(orders);

      // Update active order info
      const activeOrder = orders.find((o) => o.status && o.status.toLowerCase() !== "closed");
      if (activeOrder) {
        setActiveOrderInfo({
          orderId: activeOrder.orderId,
          status: activeOrder.status,
          itemCount: activeOrder.items.length,
        });
      } else {
        setActiveOrderInfo(null);
      }

      // Check for feedback opportunity
      await checkAndShowFeedback(orders);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    }
  }, [checkAndShowFeedback]);

  // Initial data fetch
  useEffect(() => {
    if (!jwt || !sessionId || !tableId) {
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
          getMenuItems(selectedCategory ?? undefined),
        ]);

        setCategories(cats);
        setMenuItems(items);

        // Fetch orders with feedback check
        await fetchOrdersWithFeedback();

        console.log(`[${new Date().toISOString()}] ✅ Data loaded - Categories: ${cats.length}, Items: ${items.length}`);
      } catch (error) {
        console.error("Failed to fetch initial data:", error);
        setError("Failed to load menu. Please try refreshing the page.");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [jwt, sessionId, selectedCategory, tenantSlug, tableId, fetchOrdersWithFeedback]);

  // ✅ FIXED: SignalR order status updates
  useEffect(() => {
    if (!lastOrderUpdate || !lastOrderUpdate.status) {
      console.log(`[${new Date().toISOString()}] ⏭️ Skipping SignalR update - no status`);
      return;
    }

    console.log(`[${new Date().toISOString()}] 🔔 MainContent received SignalR Order Update:`, {
      orderId: lastOrderUpdate.orderId,
      status: lastOrderUpdate.status,
      previousStatus: lastOrderUpdate.previousStatus,
      currentOrdersCount: myOrders.length
    });
    
    // Always update orders UI first
    console.log(`[${new Date().toISOString()}] 🔄 Fetching orders after SignalR update...`);
    fetchOrdersBasic().then(() => {
      console.log(`[${new Date().toISOString()}] ✅ Orders refreshed after SignalR update`);
    });

    // Show browser notification for status changes (except closed)
    const currentStatus = lastOrderUpdate.status.toLowerCase();
    if (Notification.permission === 'granted' && currentStatus !== 'closed') {
      new Notification('Order Update', {
        body: `Your order is now ${lastOrderUpdate.status}`,
        icon: '/logo.png'
      });
    }

    // ✅ Only check for feedback when order transitions to closed
    if (currentStatus === 'closed') {
      console.log(`[${new Date().toISOString()}] 🔒 Order closed via SignalR, checking feedback...`);
      
      // Small delay to ensure backend has fully updated
      setTimeout(() => {
        fetchOrdersWithFeedback();
      }, 500);
    }
  }, [lastOrderUpdate]);

  // Handle feedback submission
  const handleFeedbackSubmitted = () => {
    console.log(`[${new Date().toISOString()}] ✅ Feedback submitted successfully`);
    setShowFeedback(false);
    setFeedbackOrderId(null);
  };

  const handleCategorySelect = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
  };

  const handleAddToCart = async (item: MenuItemResponse) => {
    if (!sessionId) {
      alert("Session not initialized. Please try again.");
      return;
    }
    try {
      await addToCartBackend(sessionId, item.itemId, 1);
      onCartUpdate();
    } catch (error: any) {
      console.error("Error adding to cart:", error);
      alert("Error adding to cart. Please try again.");
    }
  };

  const handleIncrement = async (itemId: string) => {
    if (!sessionId) {
      alert("Session not initialized. Please try again.");
      return;
    }
    try {
      await addToCartBackend(sessionId, itemId, 1);
      onCartUpdate();
    } catch {
      alert("Error updating cart. Please try again.");
    }
  };

  const handleDecrement = async (itemId: string) => {
    if (!sessionId) {
      alert("Session not initialized. Please try again.");
      return;
    }
    try {
      await removeFromCartBackend(sessionId, itemId);
      onCartUpdate();
    } catch {
      alert("Error updating cart. Please try again.");
    }
  };

  const handlePlaceOrder = async () => {
    if (!sessionId) {
      alert("Session not initialized. Please try again.");
      return;
    }

    const isUpdate = activeOrderInfo !== null;
    const actionText = isUpdate ? "updating your order" : "placing your order";

    try {
      console.log(`[${new Date().toISOString()}] ${isUpdate ? "Updating" : "Creating"} order for session ${sessionId}`);

      const orderResponse = await submitOrder(sessionId, { tableId });
      console.log(`[${new Date().toISOString()}] ✅ Order ${isUpdate ? "updated" : "submitted"} successfully: ${orderResponse.orderId}`);

      if (isUpdate) {
        alert(`✅ Items added to your order!\n\nOrder #${orderResponse.orderId.slice(0, 8)}\nNew total: $${orderResponse.totalAmount.toFixed(2)}`);
      } else {
        alert(`✅ Order placed successfully!\n\nOrder #${orderResponse.orderId.slice(0, 8)}\nTotal: $${orderResponse.totalAmount.toFixed(2)}`);
      }

      onCloseCart();
      await onCartUpdate();
      await fetchOrdersBasic(); // Use basic fetch - no need for feedback check

      console.log(`[${new Date().toISOString()}] ✅ Cart and orders refreshed`);
    } catch (error: any) {
      console.error(`[${new Date().toISOString()}] ❌ Error ${actionText}:`, error);
      alert(`Error ${actionText}. Please try again.`);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto px-8 relative z-20 max-w-7xl">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto px-8 relative z-20 max-w-7xl">
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="mx-auto px-8 relative z-20 max-w-7xl">
        {/* Active Order Banner */}
        {activeOrderInfo && (
          <ActiveOrderBanner
            orderId={activeOrderInfo.orderId}
            status={activeOrderInfo.status}
            itemCount={activeOrderInfo.itemCount}
          />
        )}

        <div className="lg:grid-cols-4 mb-16 grid gap-8">
          {/* Categories Menu */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <Menu
                categories={categories}
                selectedCategory={selectedCategory}
                onCategorySelect={handleCategorySelect}
              />
            </div>
          </div>

          {/* Menu Items Grid */}
          <div className="lg:col-span-3">
            <MenuGrid
              menuItems={menuItems}
              cart={cart}
              onAddToCart={handleAddToCart}
              onIncrement={handleIncrement}
              onDecrement={handleDecrement}
            />
          </div>
        </div>
      </main>

      {/* Modals */}
      <CartModal
        isOpen={showCart}
        cart={cart}
        activeOrderId={activeOrderInfo?.orderId || null}
        onClose={onCloseCart}
        onPlaceOrder={handlePlaceOrder}
      />

      <OrdersModal
        isOpen={showOrders}
        orders={myOrders}
        activeOrderId={activeOrderInfo?.orderId || null}
        onClose={onCloseOrders}
      />

      {/* Feedback Modal - Only shown when order is first closed */}
      {showFeedback && feedbackOrderId && (
        <FeedbackModal
          isOpen={showFeedback}
          orderId={feedbackOrderId}
          orderTotal={feedbackOrderTotal}
          onClose={() => setShowFeedback(false)}
          onSubmitted={handleFeedbackSubmitted}
        />
      )}
    </>
  );
};

export default MainContent;