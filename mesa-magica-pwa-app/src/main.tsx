import { createRoot } from "react-dom/client";
import { BrowserRouter, useRoutes } from "react-router-dom";
import "./index.css";

// Load all pages from src/pages/
const modules = import.meta.glob("./pages/**/*.tsx", { eager: true });

// Convert file paths into React Router routes
const routes = Object.keys(modules).map((path) => {
    //const name = path.match(/\.\/pages\/(.*)\.tsx$/)[1]; // e.g. "index", "about"
    const name = path.match(/\.\/pages\/(.*)\.tsx$/)?.[1] ?? "";
    //const Component = modules[path].default;
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
      <App />
    </BrowserRouter>
  );
} else {
  console.error("Root element not found");
}
