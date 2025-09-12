import React from "react";

const OrderStatus: React.FC = () => {
    return (
        <section className="bg-white/50 dark:bg-neutral-950/50 py-16 relative">
            <div className="mx-auto px-8 max-w-7xl">
                <div className="text-center mb-12">
                    <p className="text-2xl font-bold mb-4">Order Status</p>
                    <div className="items-center rounded-xl bg-white/70 dark:bg-neutral-900/50 inline-flex gap-4 p-4 border border-zinc-300/70 dark:border-white/20">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="font-medium">Your order is being prepared</span>
                        <span className="text-sm text-gray-700/80 dark:text-neutral-300/80">Est. 25 minutes</span>
                    </div>
                </div>
                <div className="items-center justify-center pt-8 flex gap-8">
                    <div className="text-center">
                        <div className="text-2xl font-semibold">4.8/5</div>
                        <div className="text-sm text-gray-700/80 dark:text-neutral-300/80">Customer Rating</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-semibold">15-30</div>
                        <div className="text-sm text-gray-700/80 dark:text-neutral-300/80">Delivery Time (min)</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-semibold">Free</div>
                        <div className="text-sm text-gray-700/80 dark:text-neutral-300/80">Delivery over $25</div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default OrderStatus;
