import * as Sentry from "@sentry/react";
import { useEffect } from "react";
import { useLocation, useNavigationType, createRoutesFromChildren, matchRoutes } from "react-router-dom";

export const initSentry = () => {
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ],
      // Performance Monitoring
      tracesSampleRate: 1.0, // Capture 100% of the transactions, reduce in production!
      // Session Replay
      replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
      replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
    });
  }
};

export const SentryErrorBoundary = Sentry.ErrorBoundary;

// Custom wrapper to report user context
export const setSentryUser = (user: { id: string; email?: string; name?: string } | null) => {
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    if (user) {
      Sentry.setUser({ id: user.id, email: user.email, username: user.name });
    } else {
      Sentry.setUser(null);
    }
  }
};

export const captureException = (error: any, context?: Record<string, any>) => {
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.captureException(error, { extra: context });
  } else {
    console.error("[Sentry Dev Mode]", error, context);
  }
};
