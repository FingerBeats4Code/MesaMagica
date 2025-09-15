import React, { useState, useEffect } from 'react';
//import { useSearchParams } from 'react-router-dom';
import { getMenuItems, getCategories, type MenuItemResponse } from '../api';
import { useGlobalContext } from '../context/GlobalContext';
import { useCart } from '../context/CartContext';
import { HiMenu } from 'react-icons/hi';
import { FaShoppingCart } from 'react-icons/fa';
import { MdClose } from 'react-icons/md';

// Interface for Category (moved to api.ts, imported here)
import { Category } from '../api';

const MenuPage: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItemResponse[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { tenantSlug, jwt } = useGlobalContext();
  const { addToCart } = useCart();
  //const [searchParams] = useSearchParams();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const apiKey = import.meta.env.VITE_API_KEY || '';

  // Fetch Menu Items
  useEffect(() => {
    console.log('MenuPage - tenantSlug:', tenantSlug, 'jwt:', jwt);
    debugger;
    const fetchMenuItems = async () => {
      if (!tenantSlug || !jwt) {
        setError(`Tenant or authentication missing. Tenant: ${tenantSlug}, JWT: ${jwt || 'undefined'}`);
        return;
      }
      try {
        const response = await getMenuItems(tenantSlug, apiKey, jwt);
        setMenuItems(response);
      } catch (err: any) {
        setError(`Failed to load menu items: ${err.response?.status} - ${err.response?.data?.message || err.message}`);
      }
    };
    fetchMenuItems();
  }, [tenantSlug, apiKey, jwt]);

  // Fetch Categories
  useEffect(() => {
    const fetchCategories = async () => {
      if (!tenantSlug || !jwt) {
        setError(`Tenant or authentication missing for categories. Tenant: ${tenantSlug}, JWT: ${jwt || 'undefined'}`);
        return;
      }
      try {
        const response = await getCategories(tenantSlug, apiKey, jwt);
        setCategories(response);
      } catch (err: any) {
        setError(`Failed to load categories: ${err.response?.status} - ${err.response?.data?.message || err.message}`);
      }
    };
    fetchCategories();
  }, [tenantSlug, apiKey, jwt]);

  const handleAddToCart = (item: MenuItemResponse) => {
    if (item.isAvailable) {
      addToCart({
        itemId: item.itemId,
        name: item.name || '',
        price: item.price,
        quantity: 1,
        imageUrl: item.imageUrl ?? undefined,
      });
    }
  };

  // Filter items only when a category is selected
  const filteredItems = selectedCategoryId
    ? menuItems.filter(item => item.categoryId === selectedCategoryId)
    : menuItems;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex flex-col lg:flex-row">
      {/* Mobile: Hamburger icon */}
      <button
        className="lg:hidden fixed top-4 left-4 z-30 bg-white rounded-full p-2 shadow-md border border-gray-200"
        onClick={() => setIsSidebarOpen(true)}
        aria-label="Open categories"
      >
        <HiMenu size={28} className="text-green-600" />
      </button>

      {/* Sidebar for Categories - Desktop */}
      <aside className="w-64 bg-white shadow-lg p-6 hidden lg:block border-r border-gray-100">
        <h2 className="text-2xl font-bold mb-6 text-green-700 flex items-center gap-2">
          <FaShoppingCart className="text-green-500" /> Categories
        </h2>
        <ul className="space-y-3">
          <li>
            <button
              className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition ${
                !selectedCategoryId
                  ? 'bg-green-600 text-white shadow'
                  : 'hover:bg-green-100 text-gray-800'
              }`}
              onClick={() => setSelectedCategoryId(null)}
            >
              <span className="bg-green-200 text-green-700 rounded-full p-2">
                <FaShoppingCart />
              </span>
              All
            </button>
          </li>
          {categories.map((category) => (
            <li key={category.categoryId}>
              <button
                className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition ${
                  selectedCategoryId === category.categoryId
                    ? 'bg-green-600 text-white shadow'
                    : 'hover:bg-green-100 text-gray-800'
                }`}
                onClick={() => setSelectedCategoryId(category.categoryId)}
              >
                <span className="bg-green-100 text-green-700 rounded-full p-2">
                  <HiMenu />
                </span>
                {category.name}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Sidebar Drawer for Mobile */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 flex">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-40"
            onClick={() => setIsSidebarOpen(false)}
          />
          {/* Drawer */}
          <aside className="relative w-64 bg-white shadow-lg p-6 h-full z-50 border-r border-gray-100">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-green-600"
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Close categories"
            >
              <MdClose size={28} />
            </button>
            <h2 className="text-2xl font-bold mb-6 text-green-700 flex items-center gap-2">
              <FaShoppingCart className="text-green-500" /> Categories
            </h2>
            <ul className="space-y-3">
              <li>
                <button
                  className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition ${
                    !selectedCategoryId
                      ? 'bg-green-600 text-white shadow'
                      : 'hover:bg-green-100 text-gray-800'
                  }`}
                  onClick={() => {
                    setSelectedCategoryId(null);
                    setIsSidebarOpen(false);
                  }}
                >
                  <span className="bg-green-200 text-green-700 rounded-full p-2">
                    <FaShoppingCart />
                  </span>
                  All
                </button>
              </li>
              {categories.map((category) => (
                <li key={category.categoryId}>
                  <button
                    className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition ${
                      selectedCategoryId === category.categoryId
                        ? 'bg-green-600 text-white shadow'
                        : 'hover:bg-green-100 text-gray-800'
                    }`}
                    onClick={() => {
                      setSelectedCategoryId(category.categoryId);
                      setIsSidebarOpen(false);
                    }}
                  >
                    <span className="bg-green-100 text-green-700 rounded-full p-2">
                      <HiMenu />
                    </span>
                    {category.name}
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      )}

      {/* Main Content - Grid Layout */}
      <div className="flex-1">
        <header className="bg-green-600 text-white p-6 text-center shadow">
          <h1 className="text-3xl font-extrabold tracking-tight">Menu - {tenantSlug}</h1>
          <p className="text-base mt-1">Flat 20% Off on Orders Above ₹499</p>
        </header>
        <div className="menu-container px-4 py-8">
          {error && <p className="text-red-500 text-center mb-4">{error}</p>}
          <div className="menu-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {filteredItems.map((item) => (
              <div
                key={item.itemId}
                className="item-card bg-white rounded-xl shadow-md p-4 flex flex-col hover:shadow-lg transition"
              >
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.name || 'Menu Item'}
                    className="w-full h-40 object-cover rounded-lg mb-3"
                  />
                )}
                <h3 className="item-title text-lg font-bold text-green-800">{item.name}</h3>
                <p className="text-sm text-gray-600 mt-1 flex-1">{item.description}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="item-price text-xl font-semibold text-green-700">
                    ₹{item.price.toFixed(2)}
                  </span>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded ${
                      item.isAvailable
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-600'
                    }`}
                  >
                    {item.isAvailable ? 'Available' : 'Unavailable'}
                  </span>
                </div>
                <button
                  className="login-button w-full mt-4 px-4 py-2 bg-orange-500 text-white rounded-md font-semibold hover:bg-orange-600 disabled:bg-gray-300 transition"
                  onClick={() => handleAddToCart(item)}
                  disabled={!item.isAvailable}
                >
                  {item.isAvailable ? 'Add to Cart' : 'Unavailable'}
                </button>
              </div>
            ))}
          </div>
          {filteredItems.length === 0 && !error && (
            <p className="text-center text-gray-500 py-8">
              No items found for this category.
            </p>
          )}
        </div>
      </div>

      {/* Cart Sidebar (Mobile) */}
      <aside className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
        <div className="flex justify-between items-center">
          <span className="text-sm flex items-center gap-2">
            <FaShoppingCart className="text-green-600" /> Cart: 0 items
          </span>
          <button
            className="login-button px-4 py-2 bg-green-600 text-white rounded-md font-semibold hover:bg-green-700 transition"
            onClick={() => setIsCartOpen(true)}
          >
            View Cart
          </button>
        </div>
      </aside>

      {/* Cart Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-lg relative">
            <button
              className="absolute top-4 right-4 text-gray-500 hover:text-green-600"
              onClick={() => setIsCartOpen(false)}
              aria-label="Close cart"
            >
              <MdClose size={28} />
            </button>
            <h2 className="text-2xl font-bold mb-4 text-green-700 flex items-center gap-2">
              <FaShoppingCart className="text-green-500" /> Cart
            </h2>
            <p className="text-gray-500">Your cart is empty.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuPage;