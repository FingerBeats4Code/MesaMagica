import { createRoot } from "react-dom/client";
import { BrowserRouter, useRoutes, Navigate, useLocation } from "react-router-dom";
import { AppProvider } from "@/context/AppContext";
import { GlobalProvider } from "./context/GlobalContext";
import SessionInitializer from "@/components/SessionInitializer";
import MainContent from "@/components/MainContent";
import "./index.css";

// Load all pages from src/pages/
const modules = import.meta.glob("./pages/**/*.tsx", { eager: true });

// Convert file paths into React Router routes
const pageRoutes = Object.keys(modules).map((path) => {
  const name = path.match(/\.\/pages\/(.*)\.tsx$/)?.[1] ?? "";
  const Component = (modules[path] as { default: React.FC }).default;
  return {
    path: name === "index" ? "/" : `/${name.toLowerCase()}`,
    element: <Component />,
  };
});

function App() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const tableId = searchParams.get("tableId");

  // Conditional routing: if tableId exists, render MainContent; otherwise, redirect to /login
  const routes = [
    {
      path: "/",
      element: tableId ? <MainContent /> : <Navigate to="/login" replace />,
    },
    ...pageRoutes,
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