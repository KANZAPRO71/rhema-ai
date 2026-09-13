import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { escapeAttr, escapeHtml, renderMarkdown } from "../www/markdown.js";

describe("markdown", () => {
  describe("escapeHtml", () => {
    it("escapes HTML special characters", () => {
      assert.equal(escapeHtml('<script>alert("x")</script>'), "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    });

    it("handles empty and nullish input", () => {
      assert.equal(escapeHtml(""), "");
      assert.equal(escapeHtml(null), "null");
    });
  });

  describe("escapeAttr", () => {
    it("escapes quotes for HTML attributes", () => {
      assert.equal(escapeAttr('a"b'), "a&quot;b");
      assert.equal(escapeAttr("it's"), "it&#39;s");
    });
  });

  describe("renderMarkdown", () => {
    it("returns empty string for falsy input", () => {
      assert.equal(renderMarkdown(""), "");
      assert.equal(renderMarkdown(null), "");
    });

    it("escapes raw HTML in plain text", () => {
      const html = renderMarkdown("<img onerror=alert(1)>");
      assert.match(html, /&lt;img/);
      assert.doesNotMatch(html, /<img onerror/);
    });

    it("renders bold and links with safe href", () => {
      const html = renderMarkdown("**hello** [site](https://example.com)");
      assert.match(html, /<strong>hello<\/strong>/);
      assert.match(html, /href="https:\/\/example\.com\/?"/);
    });

    it("drops unsafe link protocols", () => {
      const html = renderMarkdown("[bad](javascript:alert(1))");
      assert.doesNotMatch(html, /href=/);
      assert.match(html, /bad/);
    });

    it("renders fenced code blocks", () => {
      const html = renderMarkdown("```js\nconst x = 1;\n```");
      assert.match(html, /<pre class="md-code"><code class="lang-js">/);
      assert.match(html, /const x = 1;/);
    });
  });
});
