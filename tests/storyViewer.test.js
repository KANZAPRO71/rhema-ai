import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { escapeHtml } from "../www/markdown.js";

/**
 * storyViewer.js builds modal HTML from AI payloads — verify escape contract.
 */
describe("storyViewer AI HTML contract", () => {
  it("neutralizes malicious verse text before innerHTML interpolation", () => {
    const verseText = '<img src=x onerror="alert(1)">';
    const html = `<blockquote>&ldquo;${escapeHtml(verseText)}&rdquo;</blockquote>`;
    assert.doesNotMatch(html, /<img/);
    assert.match(html, /&lt;img/);
  });

  it("neutralizes malicious poll options", () => {
    const pollQ = "<script>x</script>";
    const opt = { text: '"><svg/onload=alert(1)>' };
    const html = `<h3>${escapeHtml(pollQ)}</h3><span>${escapeHtml(opt.text)}</span>`;
    assert.doesNotMatch(html, /<script/);
    assert.doesNotMatch(html, /<svg/);
    assert.match(html, /&quot;&gt;&lt;svg/);
  });
});
