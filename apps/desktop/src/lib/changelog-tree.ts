export type TreeNode = {
  children: TreeNode[];
  depth: number;
  key: string;
  text: string;
};

export function parseChangelogTree(markdown: string): TreeNode[] {
  const lines = markdown.split("\n");
  const root: TreeNode[] = [];
  const stack: { node: TreeNode; depth: number }[] = [];

  for (const raw of lines) {
    const text = raw.trim();
    if (!text) continue;

    const h2 = text.match(/^##\s+(.+)/);
    const h3 = text.match(/^###\s+(.+)/);
    const bullet = text.match(/^[-*]\s+(.+)/);

    if (h2?.[1]) {
      const node: TreeNode = { children: [], depth: 0, key: `h2-${h2[1]}`, text: h2[1] };
      stack.length = 0;
      stack.push({ node, depth: 0 });
      root.push(node);
    } else if (h3?.[1]) {
      const node: TreeNode = {
        children: [],
        depth: 1,
        key: `h3-${h3[1]}`,
        text: h3[1],
      };
      while (stack.length > 0 && (stack.at(-1)?.depth ?? 0) >= 1) stack.pop();
      const parent = stack.at(-1);
      if (parent) parent.node.children.push(node);
      else root.push(node);
      stack.push({ node, depth: 1 });
    } else if (bullet?.[1]) {
      const clean = bullet[1]
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/`([^`]+)`/g, "$1")
        .trim();
      if (!clean) continue;
      const node: TreeNode = {
        children: [],
        depth: 2,
        key: `li-${clean}`,
        text: clean,
      };
      while (stack.length > 0 && (stack.at(-1)?.depth ?? 0) >= 2) stack.pop();
      const parent = stack.at(-1);
      if (parent) parent.node.children.push(node);
      else root.push(node);
    }
  }

  return root;
}
