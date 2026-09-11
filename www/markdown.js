/** Lightweight markdown → HTML (no deps). Escapes HTML first. */
export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderMarkdown(text) {
  if (!text) return "";
  let src = escapeHtml(text);
  const blocks = [];
  src = src.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const i = blocks.length;
    blocks.push(`<pre class="md-code"><code class="lang-${lang || "plain"}">${code.trimEnd()}</code></pre>`);
    return `\x00B${i}\x00`;
  });
  src = src.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  src = src.replace(/^### (.+)$/gm, "<h4>$1</h4>");
  src = src.replace(/^## (.+)$/gm, "<h3>$1</h3>");
  src = src.replace(/^# (.+)$/gm, "<h2>$1</h2>");
  src = src.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  src = src.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  src = src.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  src = src.replace(/^(?:-|\*) (.+)$/gm, "<li>$1</li>");
  src = src.replace(/(<li>[\s\S]*?<\/li>)/g, (m) => {
    if (m.startsWith("<ul>")) return m;
    return `<ul>${m}</ul>`;
  });
  src = src.replace(/\n{2,}/g, "</p><p>");
  src = `<p>${src}</p>`;
  src = src.replace(/<p><\/p>/g, "");
  src = src.replace(/\x00B(\d+)\x00/g, (_, i) => blocks[Number(i)] ?? "");
  return src;
}

export function setMarkdownEl(el, text, streaming = false) {
  if (!el) return;
  el.innerHTML = renderMarkdown(text);
  if (streaming) el.classList.add("streaming");
  else el.classList.remove("streaming");
}
