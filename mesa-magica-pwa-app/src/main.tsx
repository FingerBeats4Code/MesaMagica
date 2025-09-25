import { createRoot } from "react-dom/client";
import { BrowserRouter, useRoutes } from "react-router-dom";
import { AppProvider } from "@/context/AppContext";
import SessionInitializer from "@/components/SessionInitializer";
import "./index.css";
import { GlobalProvider } from './context/GlobalContext';

// Load all pages from src/pages/
const modules = import.meta.glob("./pages/**/*.tsx", { eager: true });

// Convert file paths into React Router routes
const routes = Object.keys(modules).map((path) => {
  const name = path.match(/\.\/pages\/(.*)\.tsx$/)?.[1] ?? "";
  const Component = (modules[path] as { default: React.FC }).default;
  return {
    path: name === "index" ? "/" : `/${name.toLowerCase()}`,
    element: <Component />,
  };
});

function App() {
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