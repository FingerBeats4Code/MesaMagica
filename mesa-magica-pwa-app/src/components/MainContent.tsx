// mesa-magica-pwa-app/src/components/MainContent.tsx
import React, { useState, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import { useSearchParams } from "react-router-dom";
import Menu from "@/components/Menu";
import MenuGrid from "@/components/MenuGrid";
import CartModal from "@/components/CartModal";
import OrdersModal from "@/components/OrdersModal";
import ActiveOrderBanner from "@/components/ActiveOrderBanner";
import {
  getCategories,
  getMenuItems,
  submitOrder,
  addToCartBackend,
  removeFromCartBackend,
  getMyOrders,
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
    if (!jwt || !sessionId || !tableId) {
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
          getMyOrders().catch(() => []),
        ]);

        setCategories(cats);
        setMenuItems(items);
        setMyOrders(orders);

        const activeOrder = orders.find((o) => o.status.toLowerCase() !== "closed");
        if (activeOrder) {
          setActiveOrderInfo({
            orderId: activeOrder.orderId,
            status: activeOrder.status,
            itemCount: activeOrder.items.length,
          });
          console.log(`[${new Date().toISOString()}] Active order detected: ${activeOrder.orderId}`);
        } else {
          setActiveOrderInfo(null);
        }

        console.log(`[${new Date().toISOString()}] ✅ Data loaded - Categories: ${cats.length}, Items: ${items.length}, Orders: ${orders.length}`);
      } catch (error) {
        console.error("Failed to fetch initial data:", error);
        setError("Failed to load menu. Please try refreshing the page.");
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
      const orders = await getMyOrders();
      setMyOrders(orders);

      const activeOrder = orders.find((o) => o.status.toLowerCase() !== "closed");
      if (activeOrder) {
        setActiveOrderInfo({
          orderId: activeOrder.orderId,
          status: activeOrder.status,
          itemCount: activeOrder.items.length,
        });
      }

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
        {activeOrderInfo && (
          <ActiveOrderBanner
            orderId={activeOrderInfo.orderId}
            status={activeOrderInfo.status}
            itemCount={activeOrderInfo.itemCount}
          />
        )}

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
    </>
  );
};

export default MainContent;