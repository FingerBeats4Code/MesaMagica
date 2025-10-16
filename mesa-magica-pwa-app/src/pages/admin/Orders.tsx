import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getActiveOrders, updateOrderStatus, getPaymentDetails } from "@/api/api";

interface Order {
  orderId: string;
  sessionId: string;
  tableId: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items: { orderItemId: string; itemId: string; itemName: string; quantity: number; price: number }[];
  paymentStatus: string;
}

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await getActiveOrders();
        setOrders(response);
        setLoading(false);
      } catch (err) {
        setError("Failed to fetch orders");
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const handleStatusUpdate = async (orderId: string, status: string) => {
    try {
      await updateOrderStatus({ orderId, status });
      setOrders(orders.map(o => o.orderId === orderId ? { ...o, status } : o));
    } catch (err) {
      setError("Failed to update order status");
    }
  };

  const handleViewPayment = async (orderId: string) => {
    try {
      const payment = await getPaymentDetails(orderId);
      alert(`Payment for Order ${orderId}: ${payment.paymentStatus}, Amount: ${payment.amountPaid}, Transaction: ${payment.transactionId}`);
    } catch (err) {
      setError("Failed to fetch payment details");
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="bg-white dark:bg-neutral-950 text-gray-800 dark:text-neutral-100 min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-6">Manage Orders</h1>
      <div className="space-y-4">
        {orders.map(order => (
          <div key={order.orderId} className="border p-4 rounded-lg">
            <h2 className="text-xl font-semibold">Table {order.tableId} - Order {order.orderId}</h2>
            <p>Status: {order.status}</p>
            <p>Total: ${order.totalAmount.toFixed(2)}</p>
            <p>Payment: {order.paymentStatus}</p>
            <p>Items: {order.items.map(item => `${item.itemName} (${item.quantity})`).join(", ")}</p>
            <div className="flex space-x-2 mt-2">
              <button
                onClick={() => handleStatusUpdate(order.orderId, "prepared")}
                className="bg-neutral-900 dark:bg-orange-500 text-white rounded-lg py-1 px-3 hover:bg-neutral-700 dark:hover:bg-orange-600"
              >
                Mark Prepared
              </button>
              <button
                onClick={() => handleStatusUpdate(order.orderId, "delivered")}
                className="bg-neutral-900 dark:bg-orange-500 text-white rounded-lg py-1 px-3 hover:bg-neutral-700 dark:hover:bg-orange-600"
              >
                Mark Delivered
              </button>
              <button
                onClick={() => handleViewPayment(order.orderId)}
                className="bg-neutral-900 dark:bg-orange-500 text-white rounded-lg py-1 px-3 hover:bg-neutral-700 dark:hover:bg-orange-600"
              >
                View Payment
              </button>
              <button
                onClick={() => navigate(`/admin/edit-cart/${order.sessionId}`)}
                className="bg-neutral-900 dark:bg-orange-500 text-white rounded-lg py-1 px-3 hover:bg-neutral-700 dark:hover:bg-orange-600"
              >
                Edit Cart
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Orders;