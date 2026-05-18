import { m } from "framer-motion";
import { Minus, Plus } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { TreeNode } from "@/lib/changelog-tree";

type ChangelogTreeProps = {
  nodes: TreeNode[];
  startCollapsed?: boolean;
};

export function ChangelogTree({ nodes, startCollapsed = true }: ChangelogTreeProps) {
  if (nodes.length === 0) return null;
  return (
    <div className="space-y-4">
      {nodes.map((node) => (
        <TreeNodeItem
          key={node.key}
          node={node}
          depth={0}
          defaultCollapsed={startCollapsed && nodes.length > 1}
        />
      ))}
    </div>
  );
}

function TreeContent({ children, collapsed }: { children: React.ReactNode; collapsed: boolean }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [h, setH] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (innerRef.current && h === null) {
      setH(innerRef.current.scrollHeight);
    }
  });

  return (
    <m.div
      initial={h === null ? { height: "auto" } : false}
      animate={{ height: collapsed ? 0 : (h ?? 0) + 2 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden"
    >
      <div ref={innerRef}>{children}</div>
    </m.div>
  );
}

function TreeNodeItem({
  node,
  depth,
  defaultCollapsed,
}: {
  node: TreeNode;
  depth: number;
  defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(depth === 0 ? (defaultCollapsed ?? true) : false);
  const hasChildren = node.children.length > 0;

  if (!hasChildren && depth > 0) {
    return (
      <div className={cn("flex items-start gap-2.5", depth > 1 ? "pl-3" : "pl-1")}>
        <span className="mt-2.5 size-1 shrink-0 rounded-full bg-[var(--text-tertiary)]" />
        <span className="min-w-0 text-13px leading-5 text-[var(--text-primary)]">{node.text}</span>
      </div>
    );
  }

  if (depth === 0) {
    return (
      <div>
        <button
          className="flex w-full items-center gap-2.5 text-left group"
          onClick={() => setCollapsed((c) => !c)}
          type="button"
        >
          {hasChildren && (
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-[9px] transition-colors",
                collapsed
                  ? "bg-[var(--bg-muted-strong)] text-[var(--text-secondary)] group-hover:bg-[var(--accent-primary)]/15 group-hover:text-[var(--accent-primary)]"
                  : "bg-[var(--accent-primary)] text-[var(--text-inverse)]",
              )}
            >
              {collapsed ? <Plus className="size-4" /> : <Minus className="size-4" />}
            </span>
          )}
          <span className="truncate text-15px font-bold text-[var(--text-primary)]">
            {node.text}
          </span>
        </button>
        <TreeContent collapsed={collapsed}>
          <div className="ml-3 mt-2 space-y-2.5 border-l-2 border-[var(--border-subtle)]/40 pl-4">
            {node.children.map((child) => (
              <TreeNodeItem key={child.key} node={child} depth={depth + 1} />
            ))}
          </div>
        </TreeContent>
      </div>
    );
  }

  if (depth === 1) {
    return (
      <div>
        <button
          className="flex w-full items-center gap-2 text-left group"
          onClick={() => setCollapsed((c) => !c)}
          type="button"
        >
          {hasChildren && (
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-[9px] transition-colors",
                collapsed
                  ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] group-hover:bg-[var(--accent-primary)]/20"
                  : "bg-[var(--accent-primary)] text-[var(--text-inverse)]",
              )}
            >
              {collapsed ? <Plus className="size-3.5" /> : <Minus className="size-3.5" />}
            </span>
          )}
          <span className="text-13px font-semibold leading-snug text-[var(--text-primary)]">
            {node.text}
          </span>
        </button>
        <TreeContent collapsed={collapsed}>
          <div className="ml-3 mt-1.5 space-y-1.5 pl-3">
            {node.children.map((child) => (
              <TreeNodeItem key={child.key} node={child} depth={depth + 1} />
            ))}
          </div>
        </TreeContent>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5 pl-3">
      <span className="mt-2.5 size-1 shrink-0 rounded-full bg-[var(--text-tertiary)]" />
      <span className="min-w-0 text-13px leading-5 text-[var(--text-primary)]">{node.text}</span>
    </div>
  );
}
