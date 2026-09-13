import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeHref,
  isAllowedExternalUrl,
  sanitizeImageMime,
  sanitizeImageSrc,
} from "../www/safeUrl.js";

describe("safeUrl", () => {
  describe("sanitizeHref", () => {
    it("allows https URLs", () => {
      assert.equal(sanitizeHref("https://example.com/path"), "https://example.com/path");
    });

    it("allows mailto", () => {
      assert.equal(sanitizeHref("mailto:support@example.com"), "mailto:support@example.com");
    });

    it("allows tel hotline numbers", () => {
      assert.equal(sanitizeHref("tel:1500456"), "tel:1500456");
      assert.equal(sanitizeHref("tel:119"), "tel:119");
    });

    it("blocks javascript: URLs", () => {
      assert.equal(sanitizeHref("javascript:alert(1)"), "");
    });

    it("blocks http (non-https)", () => {
      assert.equal(sanitizeHref("http://example.com"), "");
    });

    it("returns empty for blank input", () => {
      assert.equal(sanitizeHref(""), "");
      assert.equal(sanitizeHref("   "), "");
    });
  });

  describe("isAllowedExternalUrl", () => {
    it("returns true only for https", () => {
      assert.equal(isAllowedExternalUrl("https://rhema.ai"), true);
      assert.equal(isAllowedExternalUrl("mailto:a@b.c"), false);
    });
  });

  describe("sanitizeImageMime", () => {
    it("allows common image types", () => {
      assert.equal(sanitizeImageMime("image/png"), "image/png");
      assert.equal(sanitizeImageMime("image/jpeg; charset=utf-8"), "image/jpeg");
    });

    it("normalizes image/jpg to image/jpeg", () => {
      assert.equal(sanitizeImageMime("image/jpg"), "image/jpeg");
    });

    it("blocks unknown mime types", () => {
      assert.equal(sanitizeImageMime("text/html"), "");
      assert.equal(sanitizeImageMime("application/javascript"), "");
    });
  });

  describe("sanitizeImageSrc", () => {
    it("builds valid data URI from clean base64", () => {
      const src = sanitizeImageSrc({ mimeType: "image/png", data: "iVBORw0KGgo=" });
      assert.equal(src, "data:image/png;base64,iVBORw0KGgo=");
    });

    it("strips non-base64 characters from data", () => {
      const src = sanitizeImageSrc({ mimeType: "image/png", data: "abc<script>" });
      assert.equal(src, "data:image/png;base64,abcscript");
    });

    it("returns empty when mime or data missing", () => {
      assert.equal(sanitizeImageSrc({ mimeType: "image/png" }), "");
      assert.equal(sanitizeImageSrc({ data: "abc" }), "");
    });
  });
});
