export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

export function shouldReduceMotion(appMotionMode?: "full" | "reduced"): boolean {
  return appMotionMode === "reduced" || prefersReducedMotion();
}
