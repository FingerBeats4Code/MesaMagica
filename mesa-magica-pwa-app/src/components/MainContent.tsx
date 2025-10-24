// mesa-magica-pwa-app/src/components/MainContent.tsx
import React, { useState, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import Menu from "@/components/Menu";
import { useSearchParams } from "react-router-dom";
import {
  getCategories,
  getMenuItems,
  submitOrder,
  addToCartBackend,
  removeFromCartBackend,
  getMyOrders,
  editOrder,
  Category,
  MenuItemResponse,
  CartItem,
  OrderResponse,
} from "@/api/api";

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

const FoodCard: React.FC<FoodCardProps> = ({
  name,
  price,
  description,
  imageSrc,
  onAddToCart,
  onIncrement,
  onDecrement,
  quantity = 0,
}) => {
  return (
    <div className="bg-white/70 dark:bg-neutral-900/50 rounded-xl border border-zinc-300/70 dark:border-white/20 overflow-hidden hover:shadow-lg transition-shadow">
      <img alt={name} src={imageSrc} className="object-cover w-full h-48" />
      <div className="p-6">
        <div className="items-start justify-between mb-2 flex">
          <p className="text-lg font-semibold">{name}</p>
          <span className="text-lg font-bold text-orange-600">{price}</span>
        </div>
        <p className="text-sm text-gray-700/80 mb-4 dark:text-neutral-300/80">
          {description}
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
  const [orderRefreshTrigger, setOrderRefreshTrigger] = useState(0);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editingOrderItems, setEditingOrderItems] = useState<
    Array<{ itemId: string; itemName: string; quantity: number; price: number }>
  >([]);
  const { jwt, sessionId, tenantSlug } = useAppContext();

  // ✅ New state for active order detection
  const [activeOrderInfo, setActiveOrderInfo] = useState<{
    orderId: string;
    status: string;
    itemCount: number;
  } | null>(null);

  useEffect(() => {
    setCart(externalCart);
  }, [externalCart]);

  useEffect(() => {
    console.log(
      `[${new Date().toISOString()}] TableId changed to: ${tableId} - resetting state`
    );
    setCategories([]);
    setMenuItems([]);
    setSelectedCategory(null);
    setLoading(true);
    setError(null);
  }, [tableId]);

  // ✅ Updated useEffect to detect active orders
  useEffect(() => {
    if (!jwt || !sessionId) {
      console.log(
        `[${new Date().toISOString()}] Waiting for session initialization...`
      );
      return;
    }

    const fetchInitialData = async () => {
      setLoading(true);
      setError(null);

      console.log(
        `[${new Date().toISOString()}] Fetching initial data for tenant: ${tenantSlug}, tableId: ${tableId}, sessionId: ${sessionId}`
      );

      try {
        const [cats, items, orders] = await Promise.all([
          getCategories(),
          getMenuItems(selectedCategory ?? undefined),
          getMyOrders().catch(() => []),
        ]);

        setCategories(cats);
        setMenuItems(items);
        setMyOrders(orders);

        // ✅ Detect active order
        const activeOrder = orders.find(
          (o) => o.status.toLowerCase() !== "closed"
        );
        if (activeOrder) {
          setActiveOrderInfo({
            orderId: activeOrder.orderId,
            status: activeOrder.status,
            itemCount: activeOrder.items.length,
          });
          console.log(
            `[${new Date().toISOString()}] Active order detected: ${activeOrder.orderId}`
          );
        } else {
          setActiveOrderInfo(null);
        }

        console.log(
          `[${new Date().toISOString()}] ✅ Data loaded - Categories: ${cats.length}, Items: ${items.length}, Orders: ${orders.length}`
        );
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

  // ✅ Updated handlePlaceOrder
  const handlePlaceOrder = async () => {
    if (!sessionId) {
      alert("Session not initialized. Please try again.");
      return;
    }

    const isUpdate = activeOrderInfo !== null;
    const actionText = isUpdate ? "updating your order" : "placing your order";

    try {
      console.log(
        `[${new Date().toISOString()}] ${
          isUpdate ? "Updating" : "Creating"
        } order for session ${sessionId}`
      );

      const orderResponse = await submitOrder(sessionId, { tableId });
      console.log(
        `[${new Date().toISOString()}] ✅ Order ${
          isUpdate ? "updated" : "submitted"
        } successfully: ${orderResponse.orderId}`
      );

      // Friendly message
      if (isUpdate) {
        alert(
          `✅ Items added to your order!\n\nOrder #${orderResponse.orderId.slice(
            0,
            8
          )}\nNew total: $${orderResponse.totalAmount.toFixed(2)}`
        );
      } else {
        alert(
          `✅ Order placed successfully!\n\nOrder #${orderResponse.orderId.slice(
            0,
            8
          )}\nTotal: $${orderResponse.totalAmount.toFixed(2)}`
        );
      }

      onCloseCart();
      setOrderRefreshTrigger((prev) => prev + 1);

      await onCartUpdate();
      const orders = await getMyOrders();
      setMyOrders(orders);

      const activeOrder = orders.find(
        (o) => o.status.toLowerCase() !== "closed"
      );
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

  // ✅ Loading, error, and UI sections unchanged except new info banner + indicators

  return (
    <>
      <main className="mx-auto px-8 relative z-20 max-w-7xl">
        {activeOrderInfo && (
          <div className="mb-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <svg
                className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <p className="font-semibold text-blue-900 dark:text-blue-100">
                  Active Order in Progress
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  You have an order being prepared (Order #
                  {activeOrderInfo.orderId.slice(0, 8)} –{" "}
                  {activeOrderInfo.itemCount} items, Status:{" "}
                  {activeOrderInfo.status}).<br />
                  <strong>Adding more items will update this order.</strong>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Menu and food cards */}
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
                <p className="text-lg text-gray-600 dark:text-neutral-400">
                  No menu items available
                </p>
              </div>
            ) : (
              <div className="md:grid-cols-2 grid gap-6">
                {menuItems.map((item) => (
                  <FoodCard
                    key={item.itemId}
                    name={item.name || "Unnamed Item"}
                    price={`$${item.price.toFixed(2)}`}
                    description={item.description || "No description available"}
                    imageSrc={
                      item.imageUrl ||
                      "https://placehold.co/400x240/cccccc/ffffff?text=No+Image"
                    }
                    onAddToCart={() => handleAddToCart(item)}
                    onIncrement={() => handleIncrement(item.itemId)}
                    onDecrement={() => handleDecrement(item.itemId)}
                    quantity={
                      cart.find(
                        (cartItem) =>
                          cartItem.menuItem.itemId === item.itemId
                      )?.quantity || 0
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ✅ Updated Cart Modal */}
      {showCart && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4"
          onClick={onCloseCart}
        >
          <div
            className="bg-white dark:bg-neutral-900 rounded-t-xl sm:rounded-xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-zinc-300/70 dark:border-white/20">
              <div>
                <h2 className="text-2xl font-bold">Your Cart</h2>
                {activeOrderInfo && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Adding to Order #{activeOrderInfo.orderId.slice(0, 8)}
                  </p>
                )}
              </div>
              <button
                onClick={onCloseCart}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-6">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 dark:text-neutral-400">
                    Your cart is empty
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map(({ menuItem, quantity }, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-4 p-4 bg-white/50 dark:bg-neutral-800/50 rounded-lg"
                    >
                      <img
                        src={
                          menuItem.imageUrl ||
                          "https://placehold.co/80x80/cccccc/ffffff?text=No+Image"
                        }
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
                    $
                    {cart
                      .reduce(
                        (sum, { menuItem, quantity }) =>
                          sum + menuItem.price * quantity,
                        0
                      )
                      .toFixed(2)}
                  </span>
                </div>
                <button
                  onClick={handlePlaceOrder}
                  className="w-full bg-neutral-900 dark:bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-neutral-700 dark:hover:bg-orange-600 transition-colors"
                >
                  {activeOrderInfo
                    ? `Add to Order #${activeOrderInfo.orderId.slice(0, 8)}`
                    : "Place Order"}
                </button>
                {activeOrderInfo && (
                  <p className="text-xs text-center text-blue-600 dark:text-blue-400 mt-2">
                    These items will be added to your existing order
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ✅ Updated Orders Modal */}
      {showOrders && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4"
          onClick={onCloseOrders}
        >
          <div
            className="bg-white dark:bg-neutral-900 rounded-t-xl sm:rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-zinc-300/70 dark:border-white/20">
              <h2 className="text-2xl font-bold">My Orders</h2>
              <button
                onClick={onCloseOrders}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {myOrders.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-lg text-gray-600 dark:text-neutral-400">
                    No orders yet
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
                          {order.updatedAt !== order.createdAt && (
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                              Updated:{" "}
                              {new Date(order.updatedAt).toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              order.status.toLowerCase() === "pending"
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                                : order.status.toLowerCase() === "preparing"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                                : order.status.toLowerCase() === "served"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
                            }`}
                          >
                            {order.status}
                          </span>
                          {activeOrderInfo?.orderId === order.orderId && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                              ⚡ Active
                            </span>
                          )}
                        </div>
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
                        <div className="flex items-center justify-between font-bold mb-3">
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
