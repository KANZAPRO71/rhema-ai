import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  detectCrisisSignals,
  getCrisisHotlines,
  buildCrisisResponse,
  getCrisisSystemRule,
  CRISIS_SYSTEM_RULE_ID,
  CRISIS_SYSTEM_RULE_EN,
} from "../www/crisisGuardrail.js";

describe("crisisGuardrail", () => {
  describe("detectCrisisSignals", () => {
    it("detects Indonesian crisis phrases", () => {
      assert.equal(detectCrisisSignals("Saya mau bunuh diri"), true);
      assert.equal(detectCrisisSignals("depresi berat sekali"), true);
      assert.equal(detectCrisisSignals("tidak mau hidup lagi"), true);
    });

    it("detects English crisis phrases", () => {
      assert.equal(detectCrisisSignals("I want to die"), true);
      assert.equal(detectCrisisSignals("thinking about suicide"), true);
      assert.equal(detectCrisisSignals("self-harm urges"), true);
    });

    it("returns false for normal pastoral chat", () => {
      assert.equal(detectCrisisSignals("Bagaimana cara berdoa?"), false);
      assert.equal(detectCrisisSignals("Please explain John 3:16"), false);
    });

    it("returns false for empty input", () => {
      assert.equal(detectCrisisSignals(""), false);
      assert.equal(detectCrisisSignals("   "), false);
    });
  });

  describe("getCrisisHotlines", () => {
    it("returns Indonesia hotlines for indonesia region", () => {
      const lines = getCrisisHotlines("indonesia");
      assert.ok(lines.length >= 2);
      assert.ok(lines.some((h) => h.id === "itl"));
    });

    it("falls back to global for unknown region", () => {
      const lines = getCrisisHotlines("unknown-region");
      assert.ok(lines.some((h) => h.id === "988"));
    });
  });

  describe("buildCrisisResponse", () => {
    it("returns crisis severity with hotlines and spoken reply", () => {
      const res = buildCrisisResponse("indonesia", true);
      assert.equal(res.severity, "crisis");
      assert.equal(res.moduleId, "crisis");
      assert.ok(Array.isArray(res.hotlines));
      assert.match(res.spokenReply, /Rhema AI bukan pengganti konselor/);
      assert.match(res.spokenReply, /119|1500-456/);
    });

    it("can omit spoken reply", () => {
      const res = buildCrisisResponse("global", false);
      assert.equal(res.spokenReply, "");
      assert.ok(res.hotlines.length > 0);
    });
  });

  describe("getCrisisSystemRule", () => {
    it("returns Indonesian rule by default", () => {
      assert.equal(getCrisisSystemRule(true), CRISIS_SYSTEM_RULE_ID);
    });

    it("returns English rule when requested", () => {
      assert.equal(getCrisisSystemRule(false), CRISIS_SYSTEM_RULE_EN);
    });
  });
});
