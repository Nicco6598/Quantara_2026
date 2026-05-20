export function tariffTokenMatchesQuery(token: string, query: string): boolean {
  const queryParts = query.trim().toLowerCase().split(/\s+/);
  if (queryParts.length === 0 || (queryParts.length === 1 && queryParts[0] === "")) {
    return true;
  }
  const tokenLower = token.toLowerCase();
  return queryParts.every((part) => tokenLower.startsWith(part) || tokenLower.includes(part));
}
