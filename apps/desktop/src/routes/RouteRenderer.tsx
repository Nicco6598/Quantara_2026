import { AnimatePresence, m } from "framer-motion";
import { lazy, Suspense } from "react";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { motionVariants } from "@/motion";
import type { PendingWorkflowAction, QuantaraRoute } from "@/store/app-store";
import { routeScreens } from "./route-config";

const PlaceholderScreen = lazy(() =>
  import("@/routes/PlaceholderScreen").then((m) => ({ default: m.PlaceholderScreen })),
);

type RouteRendererProps = {
  activeRoute: QuantaraRoute;
  pendingWorkflowAction: PendingWorkflowAction;
};

function ScreenSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="size-6 animate-pulse rounded-full bg-[var(--bg-muted-strong)]" />
    </div>
  );
}

function ScreenGuard({ children, resetKey }: { children: React.ReactNode; resetKey: string }) {
  return (
    <ErrorBoundary key={resetKey} resetKey={resetKey}>
      <Suspense fallback={<ScreenSkeleton />}>{children}</Suspense>
    </ErrorBoundary>
  );
}

export function RouteRenderer({ activeRoute, pendingWorkflowAction }: RouteRendererProps) {
  const Screen = routeScreens[activeRoute];

  return (
    <ScreenGuard resetKey={`${activeRoute}:${pendingWorkflowAction ?? "idle"}`}>
      <AnimatePresence mode="popLayout">
        <m.div
          className="min-h-full transform-gpu will-change-[opacity,transform] [backface-visibility:hidden] [contain:paint]"
          key={activeRoute}
          initial={motionVariants.route.initial}
          animate={motionVariants.route.animate}
          exit={motionVariants.route.exit}
          transition={motionVariants.route.transition}
        >
          {Screen ? <Screen /> : <PlaceholderScreen title={activeRoute} />}
        </m.div>
      </AnimatePresence>
    </ScreenGuard>
  );
}
