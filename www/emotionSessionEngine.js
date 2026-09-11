/**
 * Emotion Session Engine — sesi suara 3-fase untuk Ayat untuk Perasaanmu.
 * Prolog empati → refleksi hidup → doa penghiburan (multi-turn voice).
 */

import { RHEMA_ADDRESS_RULE_SHORT } from "./rhemaAddressRule.js";
import { getAiLanguageRule, getAiLifeContextRule, isIndonesiaProfile } from "./localeProfile.js";
import { getEmotionVoiceContext } from "./aiEmotionEngine.js";
import { getDailyEmotionPrologVariation } from "./dailyRenunganEngine.js";
import {
  pickLifeRealityReference,
  pickReflectionFramework,
} from "./devotionSessionEngine.js";

export const EMOTION_OPENING_TARGET_SEC = 60;
export const EMOTION_REFLECTION_TARGET_MIN = 3;
export const EMOTION_REFLECTION_TARGET_MAX = 4;
export const EMOTION_PRAYER_TARGET_MIN = 1.5;
export const EMOTION_PRAYER_TARGET_MAX = 2;
export const EMOTION_SESSION_ESTIMATED_MINUTES =
  EMOTION_OPENING_TARGET_SEC / 60 + EMOTION_REFLECTION_TARGET_MAX + EMOTION_PRAYER_TARGET_MAX;

/** @type {Array<{ id: string, label: string, voice: boolean, icon: string }>} */
export const EMOTION_SESSION_PHASES = [
  { id: "opening", label: "Sapa & Ayat", voice: true, icon: "💛" },
  { id: "reflection", label: "Refleksi", voice: true, icon: "💡" },
  { id: "prayer", label: "Doa", voice: true, icon: "🙏" },
];

export function getEmotionVoiceRules() {
  return [
    isIndonesiaProfile()
      ? "Ini sesi penghiburan pribadi — bukan khotbah, bukan kuliah."
      : "This is a personal comfort session — not a sermon or lecture.",
    isIndonesiaProfile()
      ? "JANGAN monoton atau template; sentuh perasaan saudara dengan lembut dan jujur."
      : "Avoid monotone templates; speak gently and honestly to the listener's feelings.",
    `${getAiLanguageRule()} ${getAiLifeContextRule()}`,
    isIndonesiaProfile()
      ? "Minimal 1–2 analogi konkret yang menyentuh — biarkan saudara merasa dimengerti."
      : "At least 1–2 concrete illustrations so the listener feels understood.",
    isIndonesiaProfile()
      ? "Gunakan pertanyaan retoris ke hati — saudara tidak perlu jawab lisan."
      : "Use gentle rhetorical heart questions — no spoken answer required.",
    isIndonesiaProfile()
      ? "AI sebagai mulut/pemandu penghiburan — bukan guru step-by-step."
      : "AI as a comforting guide — not a step-by-step teacher.",
  ].join(" ");
}

/**
 * @param {object} content
 * @param {{ label: string, emoji: string, id: string }} emotion
 */
export function buildEmotionOpeningPrompt(content, emotion) {
  const verseText = content.verse?.text || "";
  const verseRef = content.verse?.reference || "";
  const theme = content.theme || `Ayat untuk ${emotion.label}`;
  const daily = content.dailyProlog || getDailyEmotionPrologVariation(emotion.id);
  const ctx = getEmotionVoiceContext(emotion);
  const validate = content.openingValidate || daily.validatePhrase || ctx.validatePhrase;
  const invite = content.openingInvite || daily.invitePhrase || ctx.invitePhrase;
  const angle = content.dailyAngle || daily.dailyAngle || "";

  return [
    `${RHEMA_ADDRESS_RULE_SHORT} Suara natural Rhema AI Live — lembut, hangat, penuh empati.`,
    getEmotionVoiceRules(),
    `Fase 1 — Sapa perasaan & bacakan ayat (maksimal ~${EMOTION_OPENING_TARGET_SEC} detik).`,
    `Saudara memilih perasaan: ${emotion.emoji} ${emotion.label}.`,
    angle ? `Sudut penghiburan hari ini: ${angle}.` : "",
    "Prolog (SEBELUM baca ayat) — WAJIB terasa berbeda dari hari kemarin:",
    `1) Sapa hangat — 'Shalom saudara' — variasikan, jangan kaku.`,
    `2) Validasi perasaan hari ini: ${validate}`,
    `3) Undangan lembut: ${invite}`,
    `4) BARU bacakan ayat ${verseRef} dengan pelan: "${verseText}". Tema: ${theme}.`,
    "Jangan tafsir panjang — fase refleksi terpisah. Langsung mulai berbicara.",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * @param {object} content
 * @param {{ label: string }} emotion
 * @param {ReturnType<typeof pickReflectionFramework>} [framework]
 * @param {string} [lifeRef]
 */
export function buildEmotionReflectionPrompt(
  content,
  emotion,
  framework = pickReflectionFramework(),
  lifeRef = pickLifeRealityReference(),
) {
  const verseText = content.verse?.text || "";
  const verseRef = content.verse?.reference || "";
  const reflection = content.reflection || "";
  const questions = framework.sampleQuestions.slice(0, 2).map((q) => `"${q}"`).join(" ");

  return [
    `${RHEMA_ADDRESS_RULE_SHORT} Suara natural Rhema AI Live — lembut, hangat, penuh penghayatan.`,
    getEmotionVoiceRules(),
    `Fase 2 — Refleksi penghiburan (${EMOTION_REFLECTION_TARGET_MIN}–${EMOTION_REFLECTION_TARGET_MAX} menit).`,
    `Perasaan saudara: ${emotion.label}. Ayat: ${verseRef} — "${verseText}".`,
    reflection ? `Garis refleksi (kembangkan hidup): ${reflection}` : "",
    `Kerangka: "${framework.label}" — ${framework.structure}`,
    `Hubungkan ke realita: ${lifeRef}. Analogi: ${framework.analogyDomain}.`,
    `Pertanyaan retoris ke hati: ${questions}`,
    "Refleksi akan dilanjutkan otomatis jika belum selesai — perdalam analogi & sentuh hati.",
    "Jangan memimpin doa — fase doa terpisah. Langsung mulai berbicara.",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * @param {number} segment
 * @param {number} elapsedMin
 * @param {object} content
 * @param {{ label: string }} emotion
 * @param {ReturnType<typeof pickReflectionFramework>} framework
 * @param {string} lifeRef
 */
export function buildEmotionReflectionContinuationPrompt(
  segment,
  elapsedMin,
  content,
  emotion,
  framework,
  lifeRef,
) {
  const verseRef = content.verse?.reference || "";
  const remaining = Math.max(1, Math.round(EMOTION_REFLECTION_TARGET_MAX - elapsedMin));

  return [
    `${RHEMA_ADDRESS_RULE_SHORT} Suara lembut, hangat, penuh empati.`,
    `[LANJUT REFLEKSI PERASAAN — bagian ${segment}]`,
    getEmotionVoiceRules(),
    "Jangan ulang sapaan atau ayat. Lanjutkan refleksi penghiburan dari titik terakhir.",
    `Perasaan: ${emotion.label}. Ayat: ${verseRef}. Target ${EMOTION_REFLECTION_TARGET_MIN}–${EMOTION_REFLECTION_TARGET_MAX} menit (sudah ~${Math.round(elapsedMin)} menit, sisa ~${remaining} menit).`,
    `Kerangka: "${framework.label}". Realita: ${lifeRef}.`,
    segment <= 2
      ? "Tambah 1 analogi hidup yang menyentuh — biarkan saudara merasa dimengerti Tuhan."
      : "Rangkum kebenaran yang menyentuh hati; siapkan transisi ke doa (belum doa dulu).",
    "Langsung lanjut berbicara.",
  ].join(" ");
}

/**
 * @param {object} content
 * @param {{ label: string }} emotion
 */
export function buildEmotionPrayerPrompt(content, emotion) {
  const verseRef = content.verse?.reference || "";
  const reflection = content.reflection || "";
  const guidedPrayer = content.guidedPrayer || "";

  return [
    `${RHEMA_ADDRESS_RULE_SHORT} Suara natural Rhema AI Live — khidmat, hangat, pelan.`,
    "Doa penghiburan — susun dari perasaan dan refleksi barusan, bukan template generik.",
    `Fase 3 — Doa (${EMOTION_PRAYER_TARGET_MIN}–${EMOTION_PRAYER_TARGET_MAX} menit). Perasaan: ${emotion.label}. Ayat: ${verseRef}.`,
    reflection ? `Bawa ke doa: ${reflection}` : "",
    guidedPrayer ? `Kerangka doa (hidupkan): ${guidedPrayer}` : "",
    "Doa jujur, spesifik, penuh pengharapan — pengakuan, permohonan, penyerahan.",
    "Doa dilanjutkan otomatis jika perlu — akhiri dengan Amen khidmat.",
    "Langsung mulai berdoa.",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * @param {number} segment
 * @param {number} elapsedMin
 * @param {object} content
 * @param {{ label: string }} emotion
 */
export function buildEmotionPrayerContinuationPrompt(segment, elapsedMin, content, emotion) {
  const remaining = Math.max(1, Math.round(EMOTION_PRAYER_TARGET_MAX - elapsedMin));
  const isFinal = elapsedMin >= EMOTION_PRAYER_TARGET_MIN - 0.2 || segment >= 2;

  return [
    `${RHEMA_ADDRESS_RULE_SHORT} Suara khidmat, hangat, pelan.`,
    `[LANJUT DOA PENGHIBURAN — bagian ${segment}]`,
    "Jangan ulang doa yang sudah diucapkan. Lanjutkan dengan kerinduan hati.",
    `Perasaan: ${emotion.label}. Target ${EMOTION_PRAYER_TARGET_MIN}–${EMOTION_PRAYER_TARGET_MAX} menit (sudah ~${Math.round(elapsedMin)} menit).`,
    isFinal
      ? "Selesaikan doa — penyerahan, syukur, Amen khidmat, hentikan respons."
      : "Lanjutkan permohonan spesifik — belum Amen.",
    "Langsung lanjut berdoa.",
  ].join(" ");
}

/**
 * @param {object} content
 * @param {string} phaseId
 * @param {{ emotion: { label: string, emoji: string, id: string }, framework?: object, lifeRef?: string }} ctx
 */
export function buildEmotionPhasePrompt(content, phaseId, ctx) {
  const emotion = ctx.emotion;
  switch (phaseId) {
    case "opening":
      return buildEmotionOpeningPrompt(content, emotion);
    case "reflection":
      return buildEmotionReflectionPrompt(content, emotion, ctx.framework, ctx.lifeRef);
    case "prayer":
      return buildEmotionPrayerPrompt(content, emotion);
    default:
      return "";
  }
}

/**
 * @param {{
 *   onPhaseChange?: (index: number, phase: typeof EMOTION_SESSION_PHASES[number]) => void,
 *   onSpeakPhase?: (prompt: string, phase: typeof EMOTION_SESSION_PHASES[number]) => void | Promise<void>,
 *   onSessionStart?: (payload: { content: object, emotion: object }) => void,
 *   onSessionEnd?: (reason: "complete" | "stop" | "timeout" | "error") => void,
 *   onMarkRead?: () => void,
 *   waitPlaybackIdle?: () => Promise<void>,
 * }} hooks
 */
export function createEmotionSessionController(hooks = {}) {
  /** @type {object | null} */
  let content = null;
  /** @type {{ label: string, emoji: string, id: string } | null} */
  let emotion = null;
  /** @type {ReturnType<typeof pickReflectionFramework> | null} */
  let sessionFramework = null;
  /** @type {string | null} */
  let sessionLifeRef = null;
  let active = false;
  let phaseIndex = -1;
  let advancing = false;
  let reflectionPhaseStartMs = 0;
  let reflectionSegmentCount = 0;
  let prayerPhaseStartMs = 0;
  let prayerSegmentCount = 0;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let sessionTimeout = null;

  function clearSessionTimeout() {
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
      sessionTimeout = null;
    }
  }

  function endSession(reason) {
    if (!active && phaseIndex < 0) return;
    clearSessionTimeout();
    active = false;
    phaseIndex = -1;
    advancing = false;
    content = null;
    emotion = null;
    sessionFramework = null;
    sessionLifeRef = null;
    reflectionPhaseStartMs = 0;
    reflectionSegmentCount = 0;
    prayerPhaseStartMs = 0;
    prayerSegmentCount = 0;
    hooks.onSessionEnd?.(reason);
  }

  async function advanceToPhase(index) {
    if (!active || !content || !emotion) return;

    const phase = EMOTION_SESSION_PHASES[index];
    if (!phase) {
      endSession("complete");
      return;
    }

    phaseIndex = index;
    hooks.onPhaseChange?.(index, phase);
    clearSessionTimeout();
    sessionTimeout = setTimeout(
      () => endSession("timeout"),
      (EMOTION_SESSION_ESTIMATED_MINUTES + 4) * 60 * 1000,
    );

    if (phase.id === "reflection") {
      reflectionPhaseStartMs = Date.now();
      reflectionSegmentCount = 0;
    }
    if (phase.id === "prayer") {
      prayerPhaseStartMs = Date.now();
      prayerSegmentCount = 0;
    }

    const prompt = buildEmotionPhasePrompt(content, phase.id, {
      emotion,
      framework: sessionFramework || undefined,
      lifeRef: sessionLifeRef || undefined,
    });
    if (!prompt) {
      phaseIndex += 1;
      void advanceToPhase(phaseIndex);
      return;
    }

    await hooks.onSpeakPhase?.(prompt, phase);
  }

  return {
    /** @param {{ content: object, emotion: { label: string, emoji: string, id: string } }} payload */
    start(payload) {
      if (active) this.stop();
      content = payload.content;
      emotion = payload.emotion;
      sessionFramework = pickReflectionFramework();
      sessionLifeRef = pickLifeRealityReference();
      active = true;
      phaseIndex = 0;
      advancing = false;
      hooks.onMarkRead?.();
      hooks.onSessionStart?.(payload);
      void advanceToPhase(0);
    },

    stop() {
      if (!active && phaseIndex < 0) return;
      endSession("stop");
    },

    async onVoiceTurnComplete() {
      if (!active || advancing) return;

      const current = EMOTION_SESSION_PHASES[phaseIndex];
      if (!current?.voice) return;

      advancing = true;
      clearSessionTimeout();
      try {
        await hooks.waitPlaybackIdle?.();
      } catch {
        /* ignore */
      }

      if (!active) {
        advancing = false;
        return;
      }

      const stillCurrent = EMOTION_SESSION_PHASES[phaseIndex];
      if (!stillCurrent?.voice || !content || !emotion) {
        advancing = false;
        return;
      }

      if (stillCurrent.id === "prayer") {
        prayerSegmentCount += 1;
        const elapsedMin = (Date.now() - prayerPhaseStartMs) / 60000;
        const maxSegments = Math.max(2, Math.ceil(EMOTION_PRAYER_TARGET_MAX / 1.75));
        const shouldContinue =
          prayerSegmentCount < maxSegments && elapsedMin < EMOTION_PRAYER_TARGET_MIN - 0.15;

        if (shouldContinue) {
          advancing = false;
          clearSessionTimeout();
          sessionTimeout = setTimeout(
            () => endSession("timeout"),
            (EMOTION_SESSION_ESTIMATED_MINUTES + 4) * 60 * 1000,
          );
          await new Promise((r) => setTimeout(r, 1200));
          if (!active || phaseIndex < 0 || EMOTION_SESSION_PHASES[phaseIndex]?.id !== "prayer") return;

          const contPrompt = buildEmotionPrayerContinuationPrompt(
            prayerSegmentCount + 1,
            elapsedMin,
            content,
            emotion,
          );
          await hooks.onSpeakPhase?.(contPrompt, stillCurrent);
          return;
        }

        try {
          await hooks.waitPlaybackIdle?.();
        } catch {
          /* ignore */
        }
        advancing = false;
        endSession("complete");
        return;
      }

      if (stillCurrent.id === "reflection") {
        reflectionSegmentCount += 1;
        const elapsedMin = (Date.now() - reflectionPhaseStartMs) / 60000;
        const maxSegments = Math.max(3, Math.ceil(EMOTION_REFLECTION_TARGET_MAX / 1.75));
        const shouldContinue =
          reflectionSegmentCount < maxSegments && elapsedMin < EMOTION_REFLECTION_TARGET_MIN - 0.15;

        if (shouldContinue) {
          advancing = false;
          clearSessionTimeout();
          sessionTimeout = setTimeout(
            () => endSession("timeout"),
            (EMOTION_SESSION_ESTIMATED_MINUTES + 4) * 60 * 1000,
          );
          await new Promise((r) => setTimeout(r, 1200));
          if (!active || phaseIndex < 0 || EMOTION_SESSION_PHASES[phaseIndex]?.id !== "reflection") return;

          const contPrompt = buildEmotionReflectionContinuationPrompt(
            reflectionSegmentCount + 1,
            elapsedMin,
            content,
            emotion,
            sessionFramework || pickReflectionFramework(),
            sessionLifeRef || pickLifeRealityReference(),
          );
          await hooks.onSpeakPhase?.(contPrompt, stillCurrent);
          return;
        }

        phaseIndex += 1;
        advancing = false;
        void advanceToPhase(phaseIndex);
        return;
      }

      phaseIndex += 1;
      advancing = false;
      void advanceToPhase(phaseIndex);
    },

    isActive() {
      return active;
    },

    getPhaseIndex() {
      return phaseIndex;
    },

    getEmotionId() {
      return emotion?.id ?? null;
    },

    getCurrentPhaseId() {
      return EMOTION_SESSION_PHASES[phaseIndex]?.id ?? null;
    },
  };
}
