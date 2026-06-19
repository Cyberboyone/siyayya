import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import "./index.css";

// Prevent stuck redirect page on mobile
if (window.location.pathname.includes("/__/auth/handler")) {
  window.location.replace("/");
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

