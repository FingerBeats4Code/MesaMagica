import { createRoot } from "react-dom/client";
import { BrowserRouter, useRoutes, Navigate, useLocation } from "react-router-dom";
import { AppProvider } from "@/context/AppContext";
import { GlobalProvider } from "./context/GlobalContext";
import SessionInitializer from "@/components/SessionInitializer";
import MainContent from "@/components/MainContent";
import Login from "./components/Login";
import Header from "@/components/Header";
import AdminLayout from "@/components/AdminLayout";
import "./index.css";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import Orders from "./pages/admin/Orders";
import Tables from "./pages/admin/Tables";
import Staff from "./pages/admin/Staff";
import EditCart from "./pages/admin/EditCart";

// Protected Route wrapper for admin pages
const ProtectedRoute: React.FC<{ children: React.ReactNode; requireAdmin?: boolean }> = ({ 
  children, 
  requireAdmin = false 
}) => {
  const adminToken = localStorage.getItem('adminToken');
  const adminRole = localStorage.getItem('adminRole');

  // Check if user is authenticated
  if (!adminToken) {
    console.log(`[${new Date().toISOString()}] No adminToken, redirecting to /login`);
    return <Navigate to="/login" replace />;
  }

  // Check if admin role is required
  if (requireAdmin && adminRole !== 'admin') {
    console.log(`[${new Date().toISOString()}] Admin role required, user has: ${adminRole}`);
    return <Navigate to="/admin" replace />;
  }

  return <AdminLayout>{children}</AdminLayout>;
};

function App() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const tableId = searchParams.get("tableId");

  // Main app routes
  const routes = [
    {
      path: "/",
      element: tableId ? (
        // Customer with tableId - show menu with session
        <div className="bg-white text-gray-800 dark:bg-neutral-950 relative isolate antialiased dark:text-neutral-100 min-h-screen">
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="h-[60vh] w-[60vh] rounded-full bg-gradient-to-br absolute -top-32 -left-32 from-indigo-200 via-lime-200 to-purple-300 opacity-20 blur-2xl dark:opacity-0"></div>
            <div className="h-[40vh] w-[50vh] rounded-full bg-gradient-to-tr absolute -bottom-20 right-10 from-fuchsia-300 via-orange-300 to-rose-200 opacity-40 blur-3xl dark:opacity-0"></div>
            <div className="h-[35vh] w-[45vh] rounded-full bg-gradient-to-b dark:h-[28vh] absolute top-28 left-1/4 from-orange-300 via-amber-200 to-rose-100 opacity-60 blur-3xl dark:from-orange-600 dark:via-amber-500 dark:to-rose-400 dark:opacity-64"></div>
          </div>
          <Header />
          <MainContent />
        </div>
      ) : (
        // No tableId - redirect to login
        <Navigate to="/login" replace />
      ),
    },
    {
      path: "/login",
      element: <Login />,
    },
    // Admin routes
    {
      path: "/admin",
      element: (
        <ProtectedRoute>
          <AdminDashboard />
        </ProtectedRoute>
      ),
    },
    {
      path: "/admin/orders",
      element: (
        <ProtectedRoute>
          <Orders />
        </ProtectedRoute>
      ),
    },
    {
      path: "/admin/tables",
      element: (
        <ProtectedRoute>
          <Tables />
        </ProtectedRoute>
      ),
    },
    {
      path: "/admin/staff",
      element: (
        <ProtectedRoute requireAdmin={true}>
          <Staff />
        </ProtectedRoute>
      ),
    },
    {
      path: "/admin/edit-cart/:sessionId",
      element: (
        <ProtectedRoute>
          <EditCart />
        </ProtectedRoute>
      ),
    },
  ];

  return useRoutes(routes);
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(
    <BrowserRouter>
      <GlobalProvider>
        <AppProvider>
          <SessionInitializer>
            <App />
          </SessionInitializer>
        </AppProvider>
      </GlobalProvider>
    </BrowserRouter>
  );
} else {
  console.error("Root element not found");
}