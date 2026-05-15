import { useCallback, useEffect, useRef, useState } from "react";

export type ChartColors = {
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
  chart6: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  borderSubtle: string;
  bgPanel: string;
  successBase: string;
  warningBase: string;
  dangerBase: string;
  infoBase: string;
  accentPrimary: string;
};

function resolveVar(style: CSSStyleDeclaration, name: string): string {
  return style.getPropertyValue(`--${name}`).trim() || "#000";
}

export function useChartColors() {
  const ref = useRef<HTMLDivElement>(null);
  const [colors, setColors] = useState<ChartColors>(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      chart1: resolveVar(style, "chart-1"),
      chart2: resolveVar(style, "chart-2"),
      chart3: resolveVar(style, "chart-3"),
      chart4: resolveVar(style, "chart-4"),
      chart5: resolveVar(style, "chart-5"),
      chart6: resolveVar(style, "chart-6"),
      textPrimary: resolveVar(style, "text-primary"),
      textSecondary: resolveVar(style, "text-secondary"),
      textTertiary: resolveVar(style, "text-tertiary"),
      borderSubtle: resolveVar(style, "border-subtle"),
      bgPanel: resolveVar(style, "bg-panel"),
      successBase: resolveVar(style, "success-base"),
      warningBase: resolveVar(style, "warning-base"),
      dangerBase: resolveVar(style, "danger-base"),
      infoBase: resolveVar(style, "info-base"),
      accentPrimary: resolveVar(style, "accent-primary"),
    };
  });

  const update = useCallback(() => {
    const el = ref.current || document.documentElement;
    const style = getComputedStyle(el);
    setColors({
      chart1: resolveVar(style, "chart-1"),
      chart2: resolveVar(style, "chart-2"),
      chart3: resolveVar(style, "chart-3"),
      chart4: resolveVar(style, "chart-4"),
      chart5: resolveVar(style, "chart-5"),
      chart6: resolveVar(style, "chart-6"),
      textPrimary: resolveVar(style, "text-primary"),
      textSecondary: resolveVar(style, "text-secondary"),
      textTertiary: resolveVar(style, "text-tertiary"),
      borderSubtle: resolveVar(style, "border-subtle"),
      bgPanel: resolveVar(style, "bg-panel"),
      successBase: resolveVar(style, "success-base"),
      warningBase: resolveVar(style, "warning-base"),
      dangerBase: resolveVar(style, "danger-base"),
      infoBase: resolveVar(style, "info-base"),
      accentPrimary: resolveVar(style, "accent-primary"),
    });
  }, []);

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "attributes" && m.attributeName === "data-theme") {
          update();
          break;
        }
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, [update]);

  return { ref, colors, update };
}
