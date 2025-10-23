import React from "react";
import { Navigate } from "react-router-dom";
import Header from "@/components/Header";

const Index: React.FC = () => {
  // Redirect to /login if accessed directly (handled by main.tsx, but kept for clarity)
  return (
    <div className="bg-white text-gray-800 dark:bg-neutral-950 relative isolate antialiased dark:text-neutral-100 min-h-screen">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="h-[60vh] w-[60vh] rounded-full bg-gradient-to-br absolute -top-32 -left-32 from-indigo-200 via-lime-200 to-purple-300 opacity-20 blur-2xl dark:opacity-0"></div>
        <div className="h-[40vh] w-[50vh] rounded-full bg-gradient-to-tr absolute -bottom-20 right-10 from-fuchsia-300 via-orange-300 to-rose-200 opacity-40 blur-3xl dark:opacity-0"></div>
        <div className="h-[35vh] w-[45vh] rounded-full bg-gradient-to-b dark:h-[28vh] absolute top-28 left-1/4 from-orange-300 via-amber-200 to-rose-100 opacity-60 blur-3xl dark:from-orange-600 dark:via-amber-500 dark:to-rose-400 dark:opacity-64"></div>
      </div>
      <Header />
      <Navigate to="/login" replace />
    </div>
  );
};

export default Index;