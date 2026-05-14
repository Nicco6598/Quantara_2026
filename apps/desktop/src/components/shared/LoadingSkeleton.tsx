import { cn } from "@/lib/utils";

export function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("h-4 rounded-md bg-[var(--skeleton-base)]", className)}
      style={{
        animation: "shimmer 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        backgroundSize: "200% 100%",
        backgroundImage:
          "linear-gradient(90deg, var(--skeleton-base) 0%, var(--skeleton-shimmer) 50%, var(--skeleton-base) 100%)",
      }}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-22px border border-[var(--border-subtle)]/60 bg-[var(--surface-base)] p-4">
      <div className="flex items-center gap-3">
        <LoadingSkeleton className="size-11 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <LoadingSkeleton className="h-3 w-20" />
          <LoadingSkeleton className="h-5 w-32" />
          <LoadingSkeleton className="h-3 w-40" />
        </div>
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <LoadingSkeleton
          /* biome-ignore lint/suspicious/noArrayIndexKey: static skeleton, no stable identity */
          key={i}
          className="h-[72px] w-full"
        />
      ))}
    </div>
  );
}
