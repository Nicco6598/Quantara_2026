import type { ReactNode } from "react";

function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function ImportPreviewWorkspace({
  actionBar,
  center,
  layoutMode,
  sidebar,
  topBar,
}: {
  actionBar: ReactNode | null;
  center: ReactNode;
  layoutMode: "modal" | "page";
  sidebar: ReactNode | null;
  topBar: ReactNode | null;
}) {
  const isPage = layoutMode === "page";

  return (
    <div
      className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", isPage && "h-full max-h-full")}
    >
      {topBar ? (
        <div className="shrink-0 border-b border-[var(--border-subtle)]/70 px-4 py-3 md:px-5">
          {topBar}
        </div>
      ) : null}

      <div
        className={cn(
          "grid min-h-0 flex-1 overflow-hidden",
          sidebar ? "grid-cols-1 lg:grid-cols-[minmax(260px,300px)_minmax(0,1fr)]" : "grid-cols-1",
        )}
      >
        {sidebar ? <div className="hidden min-h-0 overflow-hidden lg:block">{sidebar}</div> : null}

        <div className="flex min-h-0 flex-col overflow-hidden">
          {sidebar ? (
            <div className="max-h-[34dvh] min-h-[160px] overflow-hidden border-b border-[var(--border-subtle)]/70 lg:hidden">
              {sidebar}
            </div>
          ) : null}

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden px-3 py-3 md:px-4 md:py-4">
              {center}
            </div>
            {actionBar ? (
              <div className="shrink-0 border-t border-[var(--border-subtle)]/70 bg-[var(--surface-base)]">
                {actionBar}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
