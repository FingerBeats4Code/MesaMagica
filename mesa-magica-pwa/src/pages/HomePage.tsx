import React from 'react';

const HomePage: React.FC = () => {
    return (
        <div className="min-h-screen bg-white">
            {/* Main Banner */}
            <header className="banner">
                <h1 className="text-2xl font-bold">Affordable & Fresh Organics!</h1>
                <p className="text-lg">Flat 20% Off</p>
                <div className="mt-2 text-sm">
                    <p>100% chemical free & pesticide free</p>
                    <p>Cleaned & packed with hygiene</p>
                    <p>Govt. certified organics</p>
                </div>
            </header>

            {/* Category Navigation */}
            <nav className="flex overflow-x-auto gap-2 p-4 bg-gray-100 border-b">
                <button className="px-4 py-2 bg-white rounded-full shadow whitespace-nowrap">Fresh Vegetables</button>
                <button className="px-4 py-2 bg-white rounded-full shadow whitespace-nowrap">Leafy and Seasonings</button>
                <button className="px-4 py-2 bg-white rounded-full shadow whitespace-nowrap">Exotic Vegetables</button>
                <button className="px-4 py-2 bg-white rounded-full shadow whitespace-nowrap">Fresh Fruits</button>
                <button className="px-4 py-2 bg-white rounded-full shadow whitespace-nowrap">Pooja & Festive</button>
                <button className="px-4 py-2 bg-white rounded-full shadow whitespace-nowrap">Bouquet & Plants</button>
            </nav>

            {/* Featured Section */}
            <main className="p-4">
                <h2 className="text-xl font-semibold mb-4">Fresh Vegetables</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    <div className="item-card">
                        <img src="https://via.placeholder.com/300x200?text=Lady's+Finger" alt="Lady's Finger (Bhindi)" className="w-full h-32 object-cover mb-2" />
                        <h3 className="text-lg font-semibold">Lady's Finger (Bhindi)</h3>
                        <p className="text-sm text-gray-600">Fiber-rich, fresh & great for bhindi fry or curry</p>
                        <p className="text-lg font-bold">₹16</p>
                        <button className="w-full mt-2 login-button px-4 py-2 text-white rounded-md">Add to Cart</button>
                    </div>
                    <div className="item-card">
                        <img src="https://via.placeholder.com/300x200?text=Potato" alt="Potato (Aloo)" className="w-full h-32 object-cover mb-2" />
                        <h3 className="text-lg font-semibold">Potato (Aloo)</h3>
                        <p className="text-sm text-gray-600">Fresh from Agra</p>
                        <p className="text-lg font-bold">₹16</p>
                        <button className="w-full mt-2 login-button px-4 py-2 text-white rounded-md">Add to Cart</button>
                    </div>
                    {/* Add more cards as needed */}
                </div>

                <h2 className="text-xl font-semibold mb-4">In Spotlight</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-instamart-green text-white p-4 rounded text-center">
                        <h3 className="font-bold">20% OFF</h3>
                        <p>Fresh Vegetables</p>
                    </div>
                    <div className="bg-instamart-orange text-white p-4 rounded text-center">
                        <h3 className="font-bold">20% OFF</h3>
                        <p>Exotic Fruits</p>
                    </div>
                    <div className="bg-instamart-purple text-white p-4 rounded text-center">
                        <h3 className="font-bold">15% OFF</h3>
                        <p>Dairy Products</p>
                    </div>
                    <div className="bg-gray-600 text-white p-4 rounded text-center">
                        <h3 className="font-bold">Free Delivery</h3>
                        <p>Orders above ₹499</p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default HomePage;