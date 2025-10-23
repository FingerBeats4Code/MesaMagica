import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCart, editCart } from "@/api/api";

interface CartItem {
  id: string;
  sessionId: string;
  itemId: string;
  quantity: number;
  addedAt: string;
  menuItem: {
    itemId: string;
    name: string;
    description: string;
    price: number;
    categoryId: string;
    categoryName: string;
    isAvailable: boolean;
    imageUrl: string;
  };
}

const EditCart: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCart = async () => {
      try {
        const response = await getCart(sessionId!);
        setCart(response);
        setLoading(false);
      } catch (err) {
        setError("Failed to fetch cart");
        setLoading(false);
      }
    };
    if (sessionId) fetchCart();
  }, [sessionId]);

  const handleUpdateQuantity = async (itemId: string, quantity: number) => {
    try {
      await editCart({ sessionId: sessionId!, itemId, quantity });
      setCart(cart.map(item => item.itemId === itemId ? { ...item, quantity } : item));
    } catch (err) {
      setError("Failed to update cart");
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="bg-white dark:bg-neutral-950 text-gray-800 dark:text-neutral-100 min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-6">Edit Cart (Session: {sessionId})</h1>
      <div className="space-y-4">
        {cart.map(item => (
          <div key={item.id} className="border p-4 rounded-lg">
            <p>{item.menuItem.name} - Quantity: {item.quantity}</p>
            <div className="flex space-x-2 mt-2">
              <button
                onClick={() => handleUpdateQuantity(item.itemId, item.quantity + 1)}
                className="bg-neutral-900 dark:bg-orange-500 text-white rounded-lg py-1 px-3 hover:bg-neutral-700 dark:hover:bg-orange-600"
              >
                +
              </button>
              <button
                onClick={() => handleUpdateQuantity(item.itemId, Math.max(0, item.quantity - 1))}
                className="bg-neutral-900 dark:bg-orange-500 text-white rounded-lg py-1 px-3 hover:bg-neutral-700 dark:hover:bg-orange-600"
                disabled={item.quantity <= 0}
              >
                -
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={() => navigate("/admin/orders")}
        className="mt-4 bg-neutral-900 dark:bg-orange-500 text-white rounded-lg py-2 px-4 hover:bg-neutral-700 dark:hover:bg-orange-600"
      >
        Back to Orders
      </button>
    </div>
  );
};

export default EditCart;