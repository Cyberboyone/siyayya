/** Simple Levenshtein distance for typo-tolerant search */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

/** Check if query fuzzy-matches a target string */
export function fuzzyMatch(query: string, target: string): boolean {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (t.includes(q)) return true;
  // Check each word in the target
  const words = t.split(/\s+/);
  return words.some((w) => {
    if (q.length <= 2) return w.startsWith(q);
    const maxDist = q.length <= 4 ? 1 : 2;
    return levenshtein(q, w.slice(0, q.length + 1)) <= maxDist;
  });
}

/** Generate search suggestions from product/service titles */
export function getSuggestions(
  query: string,
  titles: string[],
  categories: string[],
  max = 6
): string[] {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  const matches = new Set<string>();
  
  // Exact prefix matches first
  for (const t of titles) {
    if (t.toLowerCase().includes(q)) matches.add(t);
    if (matches.size >= max) break;
  }
  // Category matches
  for (const c of categories) {
    if (c.toLowerCase().includes(q)) matches.add(c);
    if (matches.size >= max) break;
  }
  // Fuzzy matches
  if (matches.size < max) {
    for (const t of titles) {
      if (fuzzyMatch(query, t)) matches.add(t);
      if (matches.size >= max) break;
    }
  }
  return Array.from(matches).slice(0, max);
}

export const campusLocations = [
  "Male Hostel",
  "Female Hostel",
  "Faculty Area",
  "Off Campus",
];
