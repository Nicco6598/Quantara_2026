import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Segment = { color: string; label: string; value: number };
type ChartProps = { className?: string; size?: number; strokeWidth?: number };

export function ModernDonut({
  segments,
  size = 120,
  strokeWidth = 8,
  className,
}: ChartProps & { segments: Segment[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let accumulated = 0;

  return (
    <div className={cn("relative shrink-0", className)} style={{ height: size, width: size }}>
      <svg aria-label="Donut chart" className="absolute inset-0" height={size} role="img" viewBox={`0 0 ${size} ${size}`} width={size}>
        <circle cx={center} cy={center} fill="none" r={radius} stroke="var(--bg-muted-strong)" strokeWidth={strokeWidth} />
        {segments.map((seg) => {
          const fraction = seg.value / total;
          const dashLength = fraction * circumference;
          const dashOffset = -accumulated * circumference;
          accumulated += fraction;

          if (fraction === 0) return null;

          return (
            <circle
              className="origin-center -rotate-90"
              cx={center}
              cy={center}
              fill="none"
              key={seg.label}
              r={radius}
              stroke={seg.color}
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="butt"
              strokeWidth={strokeWidth}
              style={{ animation: `dash-in 1s cubic-bezier(0.22, 1, 0.36, 1) 0.2s both` }}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="animate-num text-[26px] font-bold leading-none tabular-nums text-[var(--text-primary)]">
          {total}
        </span>
        <span className="mt-1 animate-[fade-in_0.4s_ease-out_0.6s_both] text-[10px] font-medium text-[var(--text-secondary)]">
          totale
        </span>
      </div>
    </div>
  );
}

export function SegmentBars({ segments, className }: { segments: Segment[]; className?: string }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;

  return (
    <div className={cn("space-y-3", className)}>
      {segments.map((seg, i) => {
        const pct = total > 0 ? (seg.value / total) * 100 : 0;
        if (pct === 0) return null;

        return (
          <div key={seg.label}>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-2 text-[12px] font-medium text-[var(--text-secondary)]">
                <span className="size-2 rounded-full" style={{ backgroundColor: seg.color }} />
                {seg.label}
              </span>
              <span className="text-[13px] font-bold tabular-nums text-[var(--text-primary)]">
                {seg.value}
                <span className="ml-1 text-[11px] font-medium text-[var(--text-secondary)]">
                  {Math.round(pct)}%
                </span>
              </span>
            </div>
            <div className="h-[3px] overflow-hidden rounded-full bg-[var(--bg-muted-strong)]">
              <div
                className="h-full rounded-full"
                style={{ backgroundColor: seg.color, animation: `width-in 0.8s cubic-bezier(0.22, 1, 0.36, 1) ${0.5 + i * 0.12}s both` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ProgressRing({
  percentage,
  color = "var(--info-base)",
  size = 100,
  strokeWidth = 8,
  children,
  className,
}: ChartProps & { percentage: number; color?: string; children?: ReactNode }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const clamped = Math.max(0, Math.min(100, percentage));

  return (
    <div className={cn("relative shrink-0", className)} style={{ height: size, width: size }}>
      <svg aria-label="Progress ring" className="absolute inset-0" height={size} role="img" viewBox={`0 0 ${size} ${size}`} width={size}>
        <circle cx={center} cy={center} fill="none" r={radius} stroke="var(--bg-muted-strong)" strokeWidth={strokeWidth} />
        <circle
          className="origin-center -rotate-90"
          cx={center}
          cy={center}
          fill="none"
          r={radius}
          stroke={color}
          strokeDasharray={`${circumference * (clamped / 100)} ${circumference * (1 - clamped / 100)}`}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
          style={{ animation: `dash-in 1.2s cubic-bezier(0.22, 1, 0.36, 1) both` }}
        />
      </svg>
      {children ? <div className="absolute inset-0 flex items-center justify-center">{children}</div> : null}
    </div>
  );
}

export function AnimatedBarChart({
  bars,
  height = 160,
  barWidth = 24,
  gap = 8,
  className,
}: ChartProps & { bars: Array<{ label: string; value: number; color: string }>; height?: number; barWidth?: number; gap?: number }) {
  const maxValue = Math.max(...bars.map((b) => b.value), 1);
  const chartWidth = bars.length * (barWidth + gap) - gap;

  return (
    <div className={cn("w-full", className)}>
      <svg aria-label="Bar chart" className="w-full" height={height + 24} preserveAspectRatio="xMidYMid meet" role="img" viewBox={`0 0 ${chartWidth} ${height + 24}`}>
        {bars.map((bar, i) => {
          const barHeight = (bar.value / maxValue) * (height - 4);
          const x = i * (barWidth + gap) + gap / 2;
          const y = height - barHeight;

          return (
            <g key={bar.label}>
              <rect
                fill={bar.color}
                height={barHeight}
                rx={barWidth > 12 ? 4 : 3}
                width={barWidth}
                x={x}
                y={y}
                style={{ animation: `bar-rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${0.1 * i}s both` }}
              />
              <text
                className="fill-[var(--text-secondary)] text-[9px] font-medium"
                textAnchor="middle"
                x={x + barWidth / 2}
                y={height + 16}
              >
                {bar.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function AnimatedHorizontalBars({
  items,
  className,
}: {
  items: Array<{ label: string; value: number; color: string; maxValue?: number }>;
  className?: string;
}) {
  const globalMax = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item, i) => {
        const max = item.maxValue ?? globalMax;
        const pct = Math.max(0, Math.min(100, (item.value / max) * 100));

        return (
          <div key={item.label}>
            <div className="mb-1.5 flex items-center justify-between text-[12px]">
              <span className="font-medium text-[var(--text-secondary)]">{item.label}</span>
              <span className="font-semibold text-[var(--text-primary)]">{item.value.toLocaleString("it-IT")}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-muted-strong)]">
              <div
                className="h-full rounded-full"
                style={{ backgroundColor: item.color, width: `${Math.round(pct)}%`, animation: `width-in 0.8s cubic-bezier(0.22, 1, 0.36, 1) ${0.1 * i}s both` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  className,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  return (
    <span className={cn("tabular-nums animate-[fade-in_0.5s_ease-out]", className)}>
      {prefix}{value.toLocaleString("it-IT")}{suffix}
    </span>
  );
}
