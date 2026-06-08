// Top level boundary. Last resort — if anything below blows up uncaught, the
// PageCrashScreen takes over the viewport.

import { ReactNode } from "react";
import { ErrorBoundary } from "./ErrorBoundary";
import { PageCrashScreen } from "./PageCrashScreen";

export const PageBoundary = ({ children }: { children: ReactNode }) => (
  <ErrorBoundary fallback={(err) => <PageCrashScreen err={err} />}>
    {children}
  </ErrorBoundary>
);
