/**
 * Guided Prayer Session Engine — sesi doa terpandu singkat (pagi, malam, keluarga, stres).
 * 2 fase: sapa & persiapan hangat → doa hidup multi-turn (bukan template statis).
 */

import { RHEMA_ADDRESS_RULE_SHORT } from "./rhemaAddressRule.js";
import { getAiLanguageRule, getAiLifeContextRule, isIndonesiaProfile } from "./localeProfile.js";
import {
  getDevotionOpeningContext,
  pickLifeRealityReference,
} from "./devotionSessionEngine.js";

export const GUIDED_PRAYER_OPENING_TARGET_SEC = 45;
export const GUIDED_PRAYER_TARGET_MIN = 2.5;
export const GUIDED_PRAYER_TARGET_MAX = 3.5;
export const GUIDED_PRAYER_SESSION_ESTIMATED_MINUTES =
  GUIDED_PRAYER_OPENING_TARGET_SEC / 60 + GUIDED_PRAYER_TARGET_MAX;

/** @type {Array<{ id: string, label: string, voice: boolean, icon: string }>} */
export const GUIDED_PRAYER_SESSION_PHASES = [
  { id: "opening", label: "Sapa & Persiapan", voice: true, icon: "🕊" },
  { id: "prayer", label: "Doa", voice: true, icon: "🙏" },
];

/** Konteks doa per preset — melengkapi PRAYER_PRESETS. */
export const GUIDED_PRAYER_CONTEXT = {
  pagi: {
    lifeHooks: ["memulai hari dengan tergesa", "daftar tugas yang menumpuk", "berangkat kerja atau sekolah"],
    prayerFocus: "syukur atas malam yang lewat, penyerahan hari ini, hikmat dalam keputusan",
    validatePhrase: "Pagi baru — hati mungkin masih setengah bangun, tapi Tuhan sudah menunggu saudara.",
    invitePhrase: "Mari tenang sejenak sebelum langkah hari ini dimulai.",
    openingTone: "segar, penuh harapan, tidak terburu-buru",
  },
  malam: {
    lifeHooks: ["lelah setelah seharian", "pikiran yang masih berputar", "rindu damai sebelum tidur"],
    prayerFocus: "syukur atas hari ini, pengampunan, damai sejahtera tidur",
    validatePhrase: "Hari sudah cukup panjang — saudara layak menutupnya dengan damai.",
    invitePhrase: "Biarkan hati perlahan menyerahkan segalanya ke hadirat Tuhan malam ini.",
    openingTone: "lembut, menenangkan, pelan",
  },
  keluarga: {
    lifeHooks: ["rumah tangga yang sibuk", "jarak dengan anak atau orang tua", "konflik kecil yang menumpuk"],
    prayerFocus: "kesatuan keluarga, kasih, perlindungan, komunikasi yang lembut",
    validatePhrase: "Keluarga adalah tempat paling dekat — dan terkadang paling sulit dijalani.",
    invitePhrase: "Bawa rumah tangga saudara ke hadirat Bapa yang mengasihi.",
    openingTone: "hangat, penuh kasih, jujur",
  },
  stres: {
    lifeHooks: ["tekanan kerja atau studi", "kecemasan yang sulit dijelaskan", "tubuh lelah jiwa gelisah"],
    prayerFocus: "penghiburan, ketenangan, penyerahan beban, ayat damai sejahtera",
    validatePhrase: "Beban terasa berat — Tuhan tidak mengecilkan apa yang saudara rasakan.",
    invitePhrase: "Serahkan sejenak beban itu; biarkan doa menjadi napas rohani saudara.",
    openingTone: "lembut, menenangkan, penuh penghiburan",
  },
};

export function getGuidedPrayerVoiceRules() {
  return [
    isIndonesiaProfile()
      ? "AI sebagai mulut yang memanjatkan doa — bukan mengajar step-by-step."
      : "AI as a voice lifting prayer — not teaching step-by-step.",
    isIndonesiaProfile()
      ? "Doa harus hidup, spesifik, dan selaras situasi preset — bukan template generik."
      : "Prayer must feel alive, specific, and matched to the preset — not generic.",
    getAiLanguageRule(),
    getAiLifeContextRule(),
    isIndonesiaProfile()
      ? "Gunakan pertanyaan retoris lembut ke hati sebelum doa — saudara tidak perlu jawab lisan."
      : "Use a gentle rhetorical heart question before prayer — no spoken answer needed.",
  ].join(" ");
}

/**
 * @param {{ id: string }} preset
 */
export function getGuidedPrayerVoiceContext(preset) {
  return GUIDED_PRAYER_CONTEXT[preset.id] || GUIDED_PRAYER_CONTEXT.pagi;
}

/**
 * @param {typeof import("./homeWorshipData.js").PRAYER_PRESETS[number]} preset
 * @param {object} [dailyContent]
 * @param {ReturnType<typeof getDevotionOpeningContext>} [ctx]
 */
export function buildGuidedPrayerOpeningPrompt(preset, dailyContent, ctx = getDevotionOpeningContext()) {
  const prayerCtx = getGuidedPrayerVoiceContext(preset);
  const validate = dailyContent?.openingValidate || prayerCtx.validatePhrase;
  const invite = dailyContent?.openingInvite || prayerCtx.invitePhrase;
  const theme = dailyContent?.dailyTheme || "";
  const scenario = dailyContent?.lifeScenario || prayerCtx.lifeHooks.join(", ");

  return [
    `${RHEMA_ADDRESS_RULE_SHORT} Suara natural Rhema AI Live — khidmat, hangat, pelan.`,
    getGuidedPrayerVoiceRules(),
    `Fase 1 — Sapa & persiapan doa (maksimal ~${GUIDED_PRAYER_OPENING_TARGET_SEC} detik).`,
    `Preset: ${preset.emoji} ${preset.title} — ${preset.subtitle}. Nada: ${prayerCtx.openingTone}.`,
    theme ? `Tema doa hari ini: ${theme}.` : "",
    `Hari ini ${ctx.dateLabel}, pukul ${ctx.timeLabel} (${ctx.dayPart}).`,
    "1) Sapa hangat — 'Shalom saudara' — variasikan, jangan kaku; WAJIB terasa berbeda dari hari kemarin.",
    `2) Sentuh hari ini: ${validate}`,
    `3) Undangan: ${invite}`,
    `4) Sentuh realita hidup hari ini: ${scenario}.`,
    "Jangan mulai doa panjang — fase doa terpisah. Langsung mulai berbicara.",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * @param {typeof import("./homeWorshipData.js").PRAYER_PRESETS[number]} preset
 * @param {object} [dailyContent]
 * @param {string} [lifeRef]
 */
export function buildGuidedPrayerPhasePrompt(preset, dailyContent, lifeRef = pickLifeRealityReference()) {
  const ctx = getGuidedPrayerVoiceContext(preset);
  const focus = dailyContent?.prayerFocus || ctx.prayerFocus;
  const theme = dailyContent?.dailyTheme || "";
  const scenario = dailyContent?.lifeScenario || "";
  const prayerBody = dailyContent?.prayerBody || "";

  return [
    `${RHEMA_ADDRESS_RULE_SHORT} Suara natural Rhema AI Live — khidmat, hangat, penuh penghayatan.`,
    getGuidedPrayerVoiceRules(),
    `Fase 2 — Doa terpandu (${GUIDED_PRAYER_TARGET_MIN}–${GUIDED_PRAYER_TARGET_MAX} menit).`,
    `Preset: ${preset.title}. Fokus doa hari ini: ${focus}.`,
    theme ? `Tema khusus hari ini: ${theme}.` : "",
    scenario ? `Situasi hidup hari ini: ${scenario}.` : "",
    `Padukan realita: ${lifeRef}.`,
    preset.voicePrompt ? `Arah doa (kembangkan jadi doa hidup): ${preset.voicePrompt}` : "",
    prayerBody ? `Kerangka doa hari ini (hidupkan, jangan baca kaku): ${prayerBody}` : "",
    "Susun: pengakuan → syukur/permohonan spesifik → penyerahan.",
    "Doa akan dilanjutkan otomatis jika belum selesai — akhiri dengan Amen khidmat.",
    "Doa spesifik hari ini — bukan template yang sama setiap pagi. Langsung mulai berdoa.",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * @param {number} segment
 * @param {number} elapsedMin
 * @param {typeof import("./homeWorshipData.js").PRAYER_PRESETS[number]} preset
 * @param {object} [dailyContent]
 */
export function buildGuidedPrayerContinuationPrompt(segment, elapsedMin, preset, dailyContent) {
  const ctx = getGuidedPrayerVoiceContext(preset);
  const focus = dailyContent?.prayerFocus || ctx.prayerFocus;
  const theme = dailyContent?.dailyTheme || "";
  const remaining = Math.max(1, Math.round(GUIDED_PRAYER_TARGET_MAX - elapsedMin));
  const isFinal = elapsedMin >= GUIDED_PRAYER_TARGET_MIN - 0.2 || segment >= 2;

  return [
    `${RHEMA_ADDRESS_RULE_SHORT} Suara khidmat, hangat, pelan.`,
    `[LANJUT DOA TERPANDU — bagian ${segment}]`,
    getGuidedPrayerVoiceRules(),
    "Jangan ulang doa yang sudah diucapkan. Lanjutkan dengan kerinduan hati.",
    `Preset: ${preset.title}. Fokus: ${focus}.`,
    theme ? `Tema hari ini: ${theme}.` : "",
    `Target ${GUIDED_PRAYER_TARGET_MIN}–${GUIDED_PRAYER_TARGET_MAX} menit (sudah ~${Math.round(elapsedMin)} menit, sisa ~${remaining} menit).`,
    isFinal
      ? "Selesaikan doa — penyerahan, syukur, Amen khidmat, hentikan respons."
      : "Lanjutkan permohonan spesifik — belum Amen.",
    "Langsung lanjut berdoa.",
  ].join(" ");
}

/**
 * @param {typeof import("./homeWorshipData.js").PRAYER_PRESETS[number]} preset
 * @param {string} phaseId
 * @param {{ lifeRef?: string, openingContext?: ReturnType<typeof getDevotionOpeningContext>, dailyContent?: object }} [ctx]
 */
export function buildGuidedPrayerPrompt(preset, phaseId, ctx = {}) {
  switch (phaseId) {
    case "opening":
      return buildGuidedPrayerOpeningPrompt(
        preset,
        ctx.dailyContent,
        ctx.openingContext || getDevotionOpeningContext(),
      );
    case "prayer":
      return buildGuidedPrayerPhasePrompt(preset, ctx.dailyContent, ctx.lifeRef);
    default:
      return "";
  }
}

/**
 * @param {{
 *   onPhaseChange?: (index: number, phase: typeof GUIDED_PRAYER_SESSION_PHASES[number]) => void,
 *   onSpeakPhase?: (prompt: string, phase: typeof GUIDED_PRAYER_SESSION_PHASES[number]) => void | Promise<void>,
 *   onSessionStart?: (preset: object) => void,
 *   onSessionEnd?: (reason: "complete" | "stop" | "timeout" | "error") => void,
 *   onMarkRead?: () => void,
 *   waitPlaybackIdle?: () => Promise<void>,
 * }} hooks
 */
export function createGuidedPrayerSessionController(hooks = {}) {
  /** @type {typeof import("./homeWorshipData.js").PRAYER_PRESETS[number] | null} */
  let preset = null;
  /** @type {object | null} */
  let dailyContent = null;
  /** @type {ReturnType<typeof getDevotionOpeningContext> | null} */
  let sessionOpeningContext = null;
  /** @type {string | null} */
  let sessionLifeRef = null;
  let active = false;
  let phaseIndex = -1;
  let advancing = false;
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
    preset = null;
    dailyContent = null;
    sessionOpeningContext = null;
    sessionLifeRef = null;
    prayerPhaseStartMs = 0;
    prayerSegmentCount = 0;
    hooks.onSessionEnd?.(reason);
  }

  async function advanceToPhase(index) {
    if (!active || !preset) return;

    const phase = GUIDED_PRAYER_SESSION_PHASES[index];
    if (!phase) {
      endSession("complete");
      return;
    }

    phaseIndex = index;
    hooks.onPhaseChange?.(index, phase);
    clearSessionTimeout();
    sessionTimeout = setTimeout(
      () => endSession("timeout"),
      (GUIDED_PRAYER_SESSION_ESTIMATED_MINUTES + 3) * 60 * 1000,
    );

    if (phase.id === "prayer") {
      prayerPhaseStartMs = Date.now();
      prayerSegmentCount = 0;
    }

    const prompt = buildGuidedPrayerPrompt(preset, phase.id, {
      openingContext: sessionOpeningContext || undefined,
      lifeRef: sessionLifeRef || undefined,
      dailyContent: dailyContent || undefined,
    });
    if (!prompt) {
      phaseIndex += 1;
      void advanceToPhase(phaseIndex);
      return;
    }

    await hooks.onSpeakPhase?.(prompt, phase);
  }

  return {
    /** @param {{ preset: typeof import("./homeWorshipData.js").PRAYER_PRESETS[number], content?: object }} payload */
    start(payload) {
      if (active) this.stop();
      preset = payload.preset || payload;
      dailyContent = payload.content || null;
      sessionOpeningContext = getDevotionOpeningContext();
      sessionLifeRef = pickLifeRealityReference();
      active = true;
      phaseIndex = 0;
      advancing = false;
      hooks.onMarkRead?.();
      hooks.onSessionStart?.(payload.preset || payload);
      void advanceToPhase(0);
    },

    stop() {
      if (!active && phaseIndex < 0) return;
      endSession("stop");
    },

    async onVoiceTurnComplete() {
      if (!active || advancing) return;

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

      const current = GUIDED_PRAYER_SESSION_PHASES[phaseIndex];
      if (!current?.voice || !preset) {
        advancing = false;
        return;
      }

      if (current.id === "prayer") {
        prayerSegmentCount += 1;
        const elapsedMin = (Date.now() - prayerPhaseStartMs) / 60000;
        const maxSegments = Math.max(2, Math.ceil(GUIDED_PRAYER_TARGET_MAX / 1.75));
        const shouldContinue =
          prayerSegmentCount < maxSegments && elapsedMin < GUIDED_PRAYER_TARGET_MIN - 0.15;

        if (shouldContinue) {
          advancing = false;
          clearSessionTimeout();
          sessionTimeout = setTimeout(
            () => endSession("timeout"),
            (GUIDED_PRAYER_SESSION_ESTIMATED_MINUTES + 3) * 60 * 1000,
          );
          await new Promise((r) => setTimeout(r, 1200));
          if (!active || phaseIndex < 0 || GUIDED_PRAYER_SESSION_PHASES[phaseIndex]?.id !== "prayer") return;

          const contPrompt = buildGuidedPrayerContinuationPrompt(
            prayerSegmentCount + 1,
            elapsedMin,
            preset,
            dailyContent || undefined,
          );
          await hooks.onSpeakPhase?.(contPrompt, current);
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

    getPresetId() {
      return preset?.id ?? null;
    },

    getCurrentPhaseId() {
      return GUIDED_PRAYER_SESSION_PHASES[phaseIndex]?.id ?? null;
    },
  };
}
