import React, { useState, useEffect } from "react";
import { getCategories, getMenuItems, submitOrder, addToCartBackend, removeFromCartBackend, getCart, Category, MenuItemResponse, CartItem, OrderResponse } from "@/api/api";
import { useAppContext } from "@/context/AppContext";

const FoodCard: React.FC<{
    name: string;
    price: string;
    description: string;
    imageSrc: string;
    onAddToCart?: () => void;
    onIncrement?: () => void;
    onDecrement?: () => void;
    quantity?: number;
}> = ({ name, price, description, imageSrc, onAddToCart, onIncrement, onDecrement, quantity = 1 }) => {
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

    const { jwt, sessionId, tenantSlug, tableId } = useAppContext();

    useEffect(() => {
        const fetchData = async () => {
            if (!jwt || !sessionId || !tenantSlug) return;

            try {
                const apiKey = import.meta.env.VITE_TENANT_API_KEY || '';
                const cats = await getCategories(tenantSlug, apiKey, jwt);
                setCategories(cats);
                const items = await getMenuItems(tenantSlug, apiKey, jwt, selectedCategory ?? undefined);
                setMenuItems(items);
                const cartData = await getCart(tenantSlug, apiKey, jwt, sessionId);
                setCart(cartData);
            } catch (error) {
                console.error('Failed to fetch data:', error);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, [jwt, sessionId, tenantSlug, selectedCategory]);

    const handleCategorySelect = (categoryId: string | null) => {
        setSelectedCategory(categoryId);
    };

    const handleAddToCart = async (item: MenuItemResponse) => {
        const apiKey = import.meta.env.VITE_TENANT_API_KEY || '';
        try {
            await addToCartBackend(tenantSlug, apiKey, jwt, sessionId, item.itemId, 1);
            const updatedCart = await getCart(tenantSlug, apiKey, jwt, sessionId);
            setCart(updatedCart);
        } catch (error) {
            alert('Error adding to cart');
        }
    };

    const handleIncrement = async (itemId: string) => {
        const apiKey = import.meta.env.VITE_TENANT_API_KEY || '';
        try {
            await addToCartBackend(tenantSlug, apiKey, jwt, sessionId, itemId, 1);
            const updatedCart = await getCart(tenantSlug, apiKey, jwt, sessionId);
            setCart(updatedCart);
        } catch (error) {
            alert('Error updating cart');
        }
    };

    const handleDecrement = async (itemId: string) => {
        const apiKey = import.meta.env.VITE_TENANT_API_KEY || '';
        try {
            await removeFromCartBackend(tenantSlug, apiKey, jwt, sessionId, itemId);
            const updatedCart = await getCart(tenantSlug, apiKey, jwt, sessionId);
            setCart(updatedCart);
        } catch (error) {
            alert('Error updating cart');
        }
    };

    const handlePlaceOrder = async () => {
        try {
            const apiKey = import.meta.env.VITE_TENANT_API_KEY || '';
            const orderResponse = await submitOrder(jwt, tenantSlug, apiKey, sessionId, {
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
                        <p className="text-xl font-semibold mb-4">Categories</p>
                        <nav className="space-y-2">
                            <button
                                type="button"
                                className={`w-full text-left px-4 py-2 rounded-lg font-medium ${
                                    !selectedCategory ? 'bg-neutral-900 text-white' : 'text-gray-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                                }`}
                                onClick={() => handleCategorySelect(null)}
                            >
                                All Items
                            </button>
                            {categories.map((cat) => (
                                <button
                                    key={cat.categoryId}
                                    type="button"
                                    className={`w-full text-left px-4 py-2 rounded-lg font-medium ${
                                        selectedCategory === cat.categoryId ? 'bg-neutral-900 text-white' : 'text-gray-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                                    }`}
                                    onClick={() => handleCategorySelect(cat.categoryId)}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </nav>
                        <div className="mt-8 rounded-xl bg-white/50 dark:bg-neutral-900/50 p-6 border border-zinc-300/70 dark:border-white/20">
                            <p className="font-semibold text-lg mb-4">Cart Summary</p>
                            <div className="space-y-3">
                                {cart.length === 0 ? (
                                    <p className="text-sm text-gray-700 dark:text-neutral-300">Cart is empty</p>
                                ) : (
                                    <>
                                        {cart.map(({ menuItem, quantity }, idx) => (
                                            <div key={idx} className="justify-between items-center flex">
                                                <span className="text-sm text-gray-700 dark:text-neutral-300">{menuItem.name} (x{quantity})</span>
                                                <span className="text-sm font-medium">${(menuItem.price * quantity).toFixed(2)}</span>
                                            </div>
                                        ))}
                                        <div className="pt-3 border-t border-zinc-300/70 dark:border-white/20">
                                            <div className="justify-between items-center font-semibold flex">
                                                <span>Total</span>
                                                <span>${cart.reduce((sum, { menuItem, quantity }) => sum + menuItem.price * quantity, 0).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                            <button
                                type="button"
                                className="inline-flex border border-transparent transition-colors hover:bg-neutral-700 dark:hover:bg-orange-600 w-full mt-4 items-center justify-center rounded-lg bg-neutral-900 px-4 py-3 font-medium text-neutral-100 dark:bg-orange-500"
                                onClick={handlePlaceOrder}
                                disabled={cart.length === 0}
                            >
                                Place Order
                            </button>
                        </div>
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

/*import React, { useState, useEffect } from "react";
import { getCategories, getMenuItems, submitOrder, Category, MenuItemResponse } from "@/api/api";
import { useAppContext } from "@/context/AppContext";

const FoodCard: React.FC<{ name: string; price: string; description: string; imageSrc: string; onAddToCart?: () => void }> = ({ name, price, description, imageSrc, onAddToCart }) => {
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
                        <button type="button" className="border border-zinc-300/70 dark:border-white/20 flex hover:bg-neutral-100 dark:hover:bg-neutral-800 w-8 h-8 rounded-full items-center justify-center">-</button>
                        <span className="font-medium">1</span>
                        <button type="button" className="border border-zinc-300/70 dark:border-white/20 flex hover:bg-neutral-100 dark:hover:bg-neutral-800 w-8 h-8 rounded-full items-center justify-center">+</button>
                    </div>
                    <button type="button" className="hover:bg-neutral-700 dark:hover:bg-orange-600 transition-colors px-4 py-2 bg-neutral-900 dark:bg-orange-500 text-white rounded-lg text-sm font-medium" onClick={onAddToCart}>Add to Cart</button>
                </div>
            </div>
        </div>
    );
};

const MainContent: React.FC = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItemResponse[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [cart, setCart] = useState<MenuItemResponse[]>([]);

    const { jwt, sessionId, tenantSlug, tableId } = useAppContext();

    // Fetch data when jwt and sessionId are available
    useEffect(() => {
        const fetchData = async () => {
            if (!jwt || !sessionId || !tenantSlug) return;

            try {
                const apiKey = import.meta.env.VITE_TENANT_API_KEY || '';
                const cats = await getCategories(tenantSlug, apiKey, jwt);
                setCategories(cats);
                const items = await getMenuItems(tenantSlug, apiKey, jwt, selectedCategory ?? undefined);
                setMenuItems(items);
            } catch (error) {
                console.error('Failed to fetch data:', error);
            }
        };

        fetchData();
    }, [jwt, sessionId, tenantSlug, selectedCategory]);

    const handleCategorySelect = (categoryId: string | null) => {
        setSelectedCategory(categoryId);
    };

    const handleAddToCart = (item: MenuItemResponse) => {
        setCart([...cart, item]);
    };

    const handlePlaceOrder = async () => {
        try {
            const apiKey = import.meta.env.VITE_TENANT_API_KEY || '';
            await submitOrder(jwt, tenantSlug, apiKey, sessionId, { items: cart, tableId });
            alert('Order submitted!');
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
                        <p className="text-xl font-semibold mb-4">Categories</p>
                        <nav className="space-y-2">
                            <button
                                type="button"
                                className={`w-full text-left px-4 py-2 rounded-lg font-medium ${
                                    !selectedCategory ? 'bg-neutral-900 text-white' : 'text-gray-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                                }`}
                                onClick={() => handleCategorySelect(null)}
                            >
                                All Items
                            </button>
                            {categories.map((cat) => (
                                <button
                                    key={cat.categoryId}
                                    type="button"
                                    className={`w-full text-left px-4 py-2 rounded-lg font-medium ${
                                        selectedCategory === cat.categoryId ? 'bg-neutral-900 text-white' : 'text-gray-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                                    }`}
                                    onClick={() => handleCategorySelect(cat.categoryId)}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </nav>
                        <div className="mt-8 rounded-xl bg-white/50 dark:bg-neutral-900/50 p-6 border border-zinc-300/70 dark:border-white/20">
                            <p className="font-semibold text-lg mb-4">Cart Summary</p>
                            <div className="space-y-3">
                                {cart.length === 0 ? (
                                    <p className="text-sm text-gray-700 dark:text-neutral-300">Cart is empty</p>
                                ) : (
                                    <>
                                        {cart.map((item, idx) => (
                                            <div key={idx} className="justify-between items-center flex">
                                                <span className="text-sm text-gray-700 dark:text-neutral-300">{item.name}</span>
                                                <span className="text-sm font-medium">${item.price.toFixed(2)}</span>
                                            </div>
                                        ))}
                                        <div className="pt-3 border-t border-zinc-300/70 dark:border-white/20">
                                            <div className="justify-between items-center font-semibold flex">
                                                <span>Total</span>
                                                <span>${cart.reduce((sum, item) => sum + item.price, 0).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                            <button
                                type="button"
                                className="inline-flex border border-transparent transition-colors hover:bg-neutral-700 dark:hover:bg-orange-600 w-full mt-4 items-center justify-center rounded-lg bg-neutral-900 px-4 py-3 font-medium text-neutral-100 dark:bg-orange-500"
                                onClick={handlePlaceOrder}
                                disabled={cart.length === 0}
                            >
                                Place Order
                            </button>
                        </div>
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
                            />
                        ))}
                    </div>
                </div>
            </div>
        </main>
    );
};

export default MainContent;

*/