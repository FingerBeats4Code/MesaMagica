// mesa-magica-pwa-app/src/components/ActiveOrderBanner.tsx
import React from "react";

interface ActiveOrderBannerProps {
  orderId: string;
  status: string;
  itemCount: number;
}

const ActiveOrderBanner: React.FC<ActiveOrderBannerProps> = ({
  orderId,
  status,
  itemCount,
}) => {
  return (
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
            You have an order being prepared (Order #{orderId.slice(0, 8)} – {itemCount} items, Status: {status}).<br />
            <strong>Adding more items will update this order.</strong>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ActiveOrderBanner;