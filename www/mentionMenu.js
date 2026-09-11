/** Composer-style @ mention categories. */
export const MENTION_CATEGORIES = [
  { id: "files", label: "Files", prefix: "", icon: "📄" },
  { id: "file", label: "File", prefix: "File ", icon: "📄" },
  { id: "symbols", label: "Symbols", prefix: "", icon: "ƒ" },
  { id: "recent", label: "Recent", prefix: "Recent", icon: "🕐" },
  { id: "folder", label: "Folder", prefix: "Folder ", icon: "📁" },
  { id: "branch", label: "Branch", prefix: "Branch ", icon: "🌿" },
  { id: "commit", label: "Commit", prefix: "Commit ", icon: "●" },
  { id: "lint", label: "Lint", prefix: "Lint", icon: "⚠" },
  { id: "rules", label: "Rules", prefix: "Rules ", icon: "📜" },
  { id: "git", label: "Git", prefix: "Git ", icon: "⎇" },
  { id: "terminal", label: "Terminal", prefix: "Terminal", icon: "⌨" },
  { id: "codebase", label: "Codebase", prefix: "Codebase ", icon: "⌘" },
  { id: "docs", label: "Docs", prefix: "Docs ", icon: "📚" },
  { id: "web", label: "Web", prefix: "Web ", icon: "🌐" },
];

export function parseMentionQuery(raw) {
  const q = raw.trim();
  const lower = q.toLowerCase();
  if (lower.startsWith("docs")) return { category: "docs", query: q.slice(4).trim() };
  if (lower.startsWith("web")) return { category: "web", query: q.slice(3).trim() };
  if (lower.startsWith("codebase")) return { category: "codebase", query: q.slice(8).trim() };
  if (lower.startsWith("recent")) return { category: "recent", query: q.slice(6).trim() };
  if (lower.startsWith("file")) return { category: "file", query: q.slice(4).trim() };
  if (lower.startsWith("folder")) return { category: "folder", query: q.slice(6).trim() };
  if (lower.startsWith("branch")) return { category: "branch", query: q.slice(6).trim() };
  if (lower.startsWith("commit")) return { category: "commit", query: q.slice(6).trim() };
  if (lower.startsWith("lint")) return { category: "lint", query: q.slice(4).trim() };
  if (lower.startsWith("rules")) return { category: "rules", query: q.slice(5).trim() };
  if (lower.startsWith("git")) return { category: "git", query: q.slice(3).trim() };
  if (lower.startsWith("terminal")) return { category: "terminal", query: q.slice(8).trim() };
  if (q.includes(".") || q.includes("/")) return { category: "files", query: q };
  return { category: "all", query: q };
}

export function buildMentionInsert(category, item) {
  switch (category) {
    case "docs":
      return `@Docs ${item} `;
    case "web":
      return `@Web ${item} `;
    case "codebase":
      return `@Codebase ${item} `;
    case "recent":
      return `@Recent `;
    case "file":
      return `@File ${item} `;
    case "folder":
      return `@Folder ${item} `;
    case "branch":
      return item ? `@Branch ${item} ` : `@Branch `;
    case "commit":
      return `@Commit ${item} `;
    case "lint":
      return `@Lint `;
    case "rules":
      return item ? `@Rules ${item} ` : `@Rules `;
    case "git":
      return item && item !== "status" && item !== "log" && item !== "diff" ? `@Git ${item} ` : `@Git `;
    case "terminal":
      return `@Terminal `;
    case "symbols":
      return `@${item} `;
    default:
      return `@${item} `;
  }
}
