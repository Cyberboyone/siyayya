import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import { initSentry } from "./lib/sentry";
import { initAnalytics } from "./lib/analytics";
import "./index.css";

// Initialize monitoring & analytics
initSentry();
initAnalytics();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
