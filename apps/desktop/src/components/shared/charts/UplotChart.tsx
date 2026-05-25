import { m } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import uPlot from "uplot";
import { BezelSurface } from "@/components/shared/ui-primitives";
import { cn } from "@/lib/utils";
import { useChartColors } from "./useChartColors";

type UplotChartProps = {
  options: Omit<uPlot.Options, "width" | "height">;
  data: uPlot.AlignedData;
  className?: string;
  height?: number;
  onReady?: (chart: uPlot) => void;
  animateData?: boolean;
  tooltipAnchorSeries?: number;
  tooltipMaxDistance?: number;
  tooltipRenderer?: (context: {
    chart: uPlot;
    colors: ReturnType<typeof useChartColors>["colors"];
    data: uPlot.AlignedData;
    index: number;
    xValue: number;
  }) => string | null;
};

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

export function UplotChart({
  options,
  data,
  className,
  height = 280,
  onReady,
  animateData,
  tooltipAnchorSeries = 1,
  tooltipMaxDistance,
  tooltipRenderer,
}: UplotChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<uPlot | null>(null);
  const { colors } = useChartColors();
  const [width, setWidth] = useState(0);
  const optsRef = useRef(options);
  optsRef.current = options;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (document.getElementById("uplot-legend-override")) return;
    const style = document.createElement("style");
    style.id = "uplot-legend-override";
    style.textContent = `
      .u-legend {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 6px !important;
        padding: 6px 0 0 !important;
        font-size: 11px !important;
        font-family: inherit !important;
        font-weight: 500 !important;
        color: var(--text-secondary) !important;
        border-top: 1px solid color-mix(in srgb, var(--border-subtle) 50%, transparent) !important;
        margin-top: 4px !important;
        user-select: none !important;
        line-height: 1 !important;
      }
      .u-legend-row {
        display: inline-flex !important;
        align-items: center !important;
        gap: 5px !important;
        cursor: pointer !important;
        padding: 3px 8px !important;
        border-radius: 8px !important;
        transition: opacity 0.15s, background 0.15s !important;
        text-transform: none !important;
        letter-spacing: normal !important;
      }
      .u-legend-row:hover {
        background: color-mix(in srgb, var(--bg-muted) 60%, transparent) !important;
      }
      .u-legend-row:active {
        background: color-mix(in srgb, var(--bg-muted) 80%, transparent) !important;
      }
      .u-legend-row.u-off {
        opacity: 0.35 !important;
        text-decoration: line-through !important;
      }
      .u-legend-marker {
        width: 8px !important;
        height: 8px !important;
        flex-shrink: 0 !important;
        border-radius: 3px !important;
        overflow: hidden !important;
      }
      .u-legend-marker svg {
        display: block !important;
        clip-path: inset(0 round 3px) !important;
      }
      .u-legend-value {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }, []);

  const dataRef = useRef(data);
  dataRef.current = data;
  const tooltipAnchorSeriesRef = useRef(tooltipAnchorSeries);
  tooltipAnchorSeriesRef.current = tooltipAnchorSeries;
  const tooltipMaxDistanceRef = useRef(tooltipMaxDistance);
  tooltipMaxDistanceRef.current = tooltipMaxDistance;
  const tooltipRendererRef = useRef(tooltipRenderer);
  tooltipRendererRef.current = tooltipRenderer;
  const prevDataRef = useRef<uPlot.AlignedData | null>(null);

  const resolveColor = useCallback(
    (val: unknown): unknown => {
      if (val === null || val === undefined) return undefined;
      if (typeof val === "object") return val;
      if (typeof val !== "string") return "";
      if (val.startsWith("var(")) {
        const name = val.slice(4, -1).trim();
        return (colors as Record<string, string>)[name] || val;
      }
      return val;
    },
    [colors],
  );

  // Separate effect for data updates — with optional zoom animation
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const prevData = prevDataRef.current;
    prevDataRef.current = data;

    const dates = data[0] as number[];
    if (!animateData || !dates || dates.length === 0) {
      chart.setData(data);
      return;
    }

    const scaleX = chart.scales.x;
    const oldMin = scaleX?.min ?? (dates[0] as number);
    const oldMax = scaleX?.max ?? (dates[dates.length - 1] as number);

    const newMin = Math.min(...dates);
    const newMax = Math.max(...dates);
    if (newMin === oldMin && newMax === oldMax) {
      chart.setData(data);
      return;
    }

    const isZoomIn = prevData && (prevData[0] as number[]).length > dates.length;

    if (isZoomIn && prevData) {
      // ZOOM-IN: keep real old data visible, animate scale contracting, swap at end
      chart.setData(prevData, false);
      chart.setScale("x", { min: oldMin, max: oldMax });

      const dur = 380;
      const start = performance.now();
      let raf = 0;
      const c = chart;

      function tick(now: number) {
        const t = Math.min(1, (now - start) / dur);
        const p = easeOutCubic(t);
        c.setScale("x", {
          min: oldMin + (newMin - oldMin) * p,
          max: oldMax + (newMax - oldMax) * p,
        });
        if (t < 1) raf = requestAnimationFrame(tick);
        else c.setData(data);
      }
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }

    // ZOOM-OUT: set extended new data, reset to old scale, animate expanding
    chart.setData(data, false);
    chart.setScale("x", { min: oldMin, max: oldMax });

    const dur = 380;
    const start = performance.now();
    let raf = 0;
    const c = chart;

    function tick(now: number) {
      const t = Math.min(1, (now - start) / dur);
      const p = easeOutCubic(t);
      c.setScale("x", {
        min: oldMin + (newMin - oldMin) * p,
        max: oldMax + (newMax - oldMax) * p,
      });
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [data, animateData]);

  // Creation / options / resize effect
  useEffect(() => {
    if (!containerRef.current || !width) return;

    chartRef.current?.destroy();

    const rawSeries = optsRef.current.series ?? [];
    const series: uPlot.Options["series"] = rawSeries.map((s, i) => {
      if (i === 0) return s;
      const typed = s as Record<string, unknown>;
      return {
        ...typed,
        stroke: typed.stroke !== undefined ? resolveColor(typed.stroke) : undefined,
        fill: typed.fill !== undefined ? resolveColor(typed.fill) : undefined,
      };
    }) as uPlot.Options["series"];

    const rawAxes = optsRef.current.axes ?? [];
    const axes: Record<string, unknown>[] = rawAxes.filter(Boolean).map((a) => {
      const typed = a as Record<string, unknown>;
      const gridVal = typed.grid as Record<string, unknown> | undefined;
      return {
        ...typed,
        stroke: typed.stroke ? resolveColor(typed.stroke) : colors.textTertiary,
        grid: gridVal
          ? {
              ...gridVal,
              stroke: resolveColor(gridVal.stroke),
            }
          : undefined,
      };
    });

    const internalHooks: uPlot.Hooks.Arrays = {
      setCursor: [
        (self: uPlot) => {
          const idx = self.cursor.idx;
          if (idx === null || idx === undefined) {
            tooltip.style.opacity = "0";
            return;
          }

          const xVal = dataRef.current[0]?.[idx];
          if (!xVal) {
            tooltip.style.opacity = "0";
            return;
          }

          const l = self.cursor.left ?? 0;
          const t = self.cursor.top ?? 0;
          const pointLeft = self.valToPos(xVal as number, "x");
          const primarySeries = self.series[1] as Record<string, unknown> | undefined;
          const maxDistance =
            tooltipMaxDistanceRef.current ?? (primarySeries?.type === "bars" ? 32 : undefined);

          if (typeof maxDistance === "number" && Math.abs(pointLeft - l) > maxDistance) {
            tooltip.style.opacity = "0";
            return;
          }

          const d = new Date((xVal as number) * 1000);
          const dateStr = d.toLocaleDateString("it-IT", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });

          let html =
            tooltipRendererRef.current?.({
              chart: self,
              colors,
              data: dataRef.current,
              index: idx,
              xValue: xVal as number,
            }) ?? null;

          if (!html) {
            html = `<div style="font-size:10px;font-weight:600;color:var(--text-secondary)">${dateStr}</div>`;
            for (let i = 1; i < dataRef.current.length; i++) {
              const val = (dataRef.current[i]?.[idx] as number) ?? 0;
              const label = (self.series[i]?.label || `Serie ${i}`) as string;
              const stroke =
                typeof self.series[i]?.stroke === "string"
                  ? (self.series[i]?.stroke as string)
                  : colors.chart1;
              html += `<div style="margin-top:2px;display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:var(--text-primary)">
          <span style="width:6px;height:6px;border-radius:50%;background:${stroke};flex-shrink:0"></span>
          ${label}: ${val.toLocaleString("it-IT", { style: "currency", currency: "EUR", minimumFractionDigits: 0 })}
        </div>`;
            }
          }

          tooltip.innerHTML = html;

          const container = containerRef.current;
          const containerWidth = container?.clientWidth ?? 0;
          const containerHeight = container?.clientHeight ?? 0;
          const plotLeft = self.bbox.left / devicePixelRatio;
          const plotTop = self.bbox.top / devicePixelRatio;
          const anchorSeries = tooltipAnchorSeriesRef.current;
          const anchorValue = dataRef.current[anchorSeries]?.[idx];
          const anchorScale = (self.series[anchorSeries]?.scale as string | undefined) ?? "y";
          const offsetX = 14;
          const offsetY = 14;
          const cursorX = plotLeft + pointLeft;
          const cursorY =
            typeof anchorValue === "number" && Number.isFinite(anchorValue)
              ? plotTop + self.valToPos(anchorValue, anchorScale)
              : plotTop + t;
          const preferredRight = cursorX + offsetX;
          const preferredLeft = cursorX - tooltip.offsetWidth - offsetX;
          const maxLeft = Math.max(8, containerWidth - tooltip.offsetWidth - 8);
          const left =
            preferredRight + tooltip.offsetWidth <= containerWidth - 8
              ? preferredRight
              : preferredLeft;
          const preferredTop = cursorY + offsetY;
          const fallbackTop = cursorY - tooltip.offsetHeight - offsetY;
          const unclampedTop =
            preferredTop + tooltip.offsetHeight <= containerHeight - 8 ? preferredTop : fallbackTop;
          const maxTop = Math.max(8, containerHeight - tooltip.offsetHeight - 8);
          const clampedLeft = Math.max(8, Math.min(left, maxLeft));
          const top = Math.max(8, Math.min(unclampedTop, maxTop));

          tooltip.style.left = `${clampedLeft}px`;
          tooltip.style.top = `${top}px`;
          tooltip.style.opacity = "1";
        },
      ],
    };

    // Merge user drawClear hook (for today line etc.) with internal hooks
    const mergedHooks = { ...internalHooks } as Record<string, unknown>;
    const userHookArrays = optsRef.current.hooks as Record<string, unknown> | undefined;
    if (userHookArrays) {
      for (const key of Object.keys(userHookArrays)) {
        const userArr = userHookArrays[key];
        const internalArr = mergedHooks[key];
        if (Array.isArray(userArr)) {
          mergedHooks[key] = internalArr
            ? [...(internalArr as unknown[]), ...(userArr as unknown[])]
            : userArr;
        }
      }
    }

    const tooltip = document.createElement("div");
    tooltip.className =
      "pointer-events-none absolute z-[var(--z-dropdown-menu)] rounded-14px border border-[var(--border-subtle)]/60 bg-[var(--surface-base)]/94 px-3 py-2 text-11px font-medium text-[var(--text-secondary)] shadow-[0_20px_58px_color-mix(in_srgb,var(--text-primary)_16%,transparent)] backdrop-blur-xl opacity-0 transition-opacity duration-[var(--duration-fast)]";

    containerRef.current.appendChild(tooltip);

    const resolved: uPlot.Options = {
      ...optsRef.current,
      width,
      height,
      series,
      axes,
      cursor: {
        lock: false,
        points: { show: false },
        drag: { x: false, y: false },
      },
      hooks: mergedHooks as uPlot.Hooks.Arrays,
    };

    const u = new uPlot(resolved, dataRef.current, containerRef.current);
    chartRef.current = u;

    const defaultTooltip = containerRef.current?.querySelector(".u-cursor-t") as HTMLElement | null;
    if (defaultTooltip) defaultTooltip.style.display = "none";

    onReady?.(u);

    return () => {
      tooltip.remove();
      u.destroy();
    };
  }, [width, height, colors, resolveColor, onReady]);

  return (
    <m.div
      animate={{ opacity: 1, scaleY: 1 }}
      className={cn("w-full", className)}
      initial={{ opacity: 0, scaleY: 0.97 }}
      transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
    >
      <BezelSurface innerClassName="p-3 pb-2">
        <div ref={containerRef} className="relative w-full" />
      </BezelSurface>
    </m.div>
  );
}
