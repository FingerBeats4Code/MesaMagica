import React from "react";

const MainContent: React.FC = () => {
    return (
        <main className="mx-auto px-8 relative z-20 max-w-7xl">
            <div className="text-center py-16">
                <div className="space-y-6">
                    <div className="items-center px-4 py-2 rounded-full bg-white/70 text-sm dark:bg-white/10 inline-flex gap-2 border border-zinc-300/70 dark:border-white/20">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span className="text-gray-700 dark:text-neutral-300">Fresh &amp; Delicious</span>
                    </div>
                    <p className="text-4xl font-bold leading-tight lg:text-6xl">Delicious Food Menu</p>
                    <p className="text-lg text-gray-700/80 mx-auto dark:text-neutral-300/80 max-w-2xl">Discover our carefully crafted menu featuring fresh ingredients and authentic flavors. Order your favorites and enjoy fast delivery.</p>
                </div>
            </div>
            <div className="lg:grid-cols-4 mb-16 grid gap-8">
                <div className="lg:col-span-1">
                    <div className="sticky top-8">
                        <p className="text-xl font-semibold mb-4">Categories</p>
                        <nav className="space-y-2">
                            <button type="button" className="w-full text-left px-4 py-2 rounded-lg bg-neutral-900 text-white font-medium">All Items</button>
                            <button type="button" className="dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors w-full text-left px-4 py-2 rounded-lg text-gray-700">Appetizers</button>
                            <button type="button" className="dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors w-full text-left px-4 py-2 rounded-lg text-gray-700">Main Course</button>
                            <button type="button" className="dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors w-full text-left px-4 py-2 rounded-lg text-gray-700">Desserts</button>
                            <button type="button" className="dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors w-full text-left px-4 py-2 rounded-lg text-gray-700">Beverages</button>
                        </nav>
                        <div className="mt-8 rounded-xl bg-white/50 dark:bg-neutral-900/50 p-6 border border-zinc-300/70 dark:border-white/20">
                            <p className="font-semibold text-lg mb-4">Cart Summary</p>
                            <div className="space-y-3">
                                <div className="justify-between items-center flex">
                                    <span className="text-sm text-gray-700 dark:text-neutral-300">Grilled Salmon</span>
                                    <span className="text-sm font-medium">$24.99</span>
                                </div>
                                <div className="justify-between items-center flex">
                                    <span className="text-sm text-gray-700 dark:text-neutral-300">Caesar Salad</span>
                                    <span className="text-sm font-medium">$12.99</span>
                                </div>
                                <div className="justify-between items-center flex">
                                    <span className="text-sm text-gray-700 dark:text-neutral-300">Chocolate Cake</span>
                                    <span className="text-sm font-medium">$8.99</span>
                                </div>
                                <div className="pt-3 border-t border-zinc-300/70 dark:border-white/20">
                                    <div className="justify-between items-center font-semibold flex">
                                        <span>Total</span>
                                        <span>$46.97</span>
                                    </div>
                                </div>
                            </div>
                            <button type="button" className="inline-flex border border-transparent transition-colors hover:bg-neutral-700 dark:hover:bg-orange-600 w-full mt-4 items-center justify-center rounded-lg bg-neutral-900 px-4 py-3 font-medium text-neutral-100 dark:bg-orange-500">Place Order</button>
                        </div>
                    </div>
                </div>
                <div className="lg:col-span-3">
                    <div className="md:grid-cols-2 grid gap-6">
                        <FoodCard name="Grilled Salmon" price="$24.99" description="Fresh Atlantic salmon grilled to perfection with herbs and lemon butter sauce." imageSrc="https://placehold.co/400x240/f97316/ffffff?text=Grilled+Salmon" />
                        <FoodCard name="Ribeye Steak" price="$32.99" description="Premium ribeye steak cooked to your preference with roasted vegetables." imageSrc="https://placehold.co/400x240/dc2626/ffffff?text=Ribeye+Steak" />
                        <FoodCard name="Caesar Salad" price="$12.99" description="Crisp romaine lettuce with parmesan cheese, croutons and caesar dressing." imageSrc="https://placehold.co/400x240/16a34a/ffffff?text=Caesar+Salad" />
                        <FoodCard name="Mushroom Risotto" price="$18.99" description="Creamy arborio rice with mixed mushrooms and parmesan cheese." imageSrc="https://placehold.co/400x240/a855f7/ffffff?text=Mushroom+Risotto" />
                        <FoodCard name="Chocolate Cake" price="$8.99" description="Rich chocolate cake layered with smooth chocolate ganache." imageSrc="https://placehold.co/400x240/7c3aed/ffffff?text=Chocolate+Cake" />
                        <FoodCard name="Fresh Orange Juice" price="$4.99" description="Freshly squeezed orange juice served chilled with no artificial additives." imageSrc="https://placehold.co/400x240/0891b2/ffffff?text=Fresh+Juice" />
                    </div>
                </div>
            </div>
        </main>
    );
};

export default MainContent;

const FoodCard: React.FC<{ name: string; price: string; description: string; imageSrc: string }> = ({ name, price, description, imageSrc }) => {
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
                    <button type="button" className="hover:bg-neutral-700 dark:hover:bg-orange-600 transition-colors px-4 py-2 bg-neutral-900 dark:bg-orange-500 text-white rounded-lg text-sm font-medium">Add to Cart</button>
                </div>
            </div>
        </div>
    );
};
