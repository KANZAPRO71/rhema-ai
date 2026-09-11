/**
 * Profil Gemini Live — instruksi & tool declarations (BYOK client-side).
 */
import { RHEMA_ADDRESS_RULE, RHEMA_CREATOR_META } from "./rhemaAddressRule.js";
import {
  RHEMA_VOICE_LOCKED,
  geminiLiveWsUrl,
  geminiModelResource,
  resolveGeminiLiveModel,
} from "./geminiConstants.js";
import { buildLiveSessionTimeContext } from "./voiceSessionTime.js";
import {
  getAiLanguageRule,
  getAiLifeContextRule,
  getLiveVoiceDevotionStructureRule,
  getPrimaryBibleLabel,
  isIndonesiaProfile,
} from "./localeProfile.js";

const GEMINI_LIVE_INPUT_RATE = 16000;
const GEMINI_LIVE_OUTPUT_RATE = 24000;

const VOICE_PROFILES = {
  "rhema-ide": {
    id: "rhema-ide",
    instructions:
      "Anda adalah Rhema AI, asisten pemrograman live di dalam IDE. Jawab singkat dan jelas dalam Bahasa Indonesia kecuali user meminta English. Fokus pada kode, terminal, arsitektur, dan langkah konkret.",
  },
  "alkitab-voice": {
    id: "alkitab-voice",
    instructions: "", // resolved at runtime — see buildAlkitabVoiceInstructions()
    contextHint: "",
  },
};

function buildAlkitabVoiceInstructions() {
  const bible = getPrimaryBibleLabel();
  if (!isIndonesiaProfile()) {
    return [
      `You are Rhema AI — a Scripture worship companion for global English-speaking users.`,
      `Primary Bible: ${bible} (public domain). Speak calmly, warmly, and concisely — like live pastoral voice counseling.`,
      getAiLanguageRule(),
      getAiLifeContextRule(),
      `IMPORTANT: Do not invent Scripture quotes — use lookup_verse for offline KJV text on device.`,
      `For sermon or exposition requests: use classic three-point sermon structure (I, II, III), KJV readings, illustration, application, closing prayer.`,
      getLiveVoiceDevotionStructureRule(),
      `Time/date questions: answer from session time context or get_session_metadata — never refuse.`,
      RHEMA_CREATOR_META,
      RHEMA_ADDRESS_RULE,
    ].join(" ");
  }
  return [
    "Anda adalah pendamping rohani berbasis Alkitab (Terjemahan Baru / LAI).",
    "Berbicara tenang, hormat, dan singkat — seperti konseling suara live.",
    getAiLanguageRule(),
    getAiLifeContextRule(),
    "PENTING: 'terjemahkan' ayat = jelaskan arti dalam Indonesia, bukan ke Inggris kecuali diminta eksplisit.",
    "Jangan mengarang kutipan ayat TB — gunakan tool lookup.",
    "Gunakan tool lookup_passage, search_tb, verify_verse untuk kedalaman firman TB.",
    getLiveVoiceDevotionStructureRule(),
    "Pertanyaan jam/tanggal/waktu: jawab dari konteks waktu sesi atau tool get_session_metadata — jangan menolak.",
    RHEMA_CREATOR_META,
    RHEMA_ADDRESS_RULE,
  ].join(" ");
}

function buildAlkitabVoiceContextHint() {
  if (!isIndonesiaProfile()) {
    return `Use King James Version (KJV) offline on device. Hymn lookup (Kidung Jemaat / Buku Ende) available for Indonesian worship context when user asks.`;
  }
  return "Gunakan Terjemahan Baru (TB) LAI. Pujian: Kidung Jemaat (KJ) dan Buku Ende (BE) — tool lookup_hymn.";
}

const PERSONAS_ID = {
  pastor: {
    instruction:
      "Anda adalah Gembala dan Konselor Rohani Rhema AI yang penuh kasih, empati, dan kebijaksanaan firman. " +
      RHEMA_ADDRESS_RULE,
  },
  preacher: {
    instruction:
      "Anda adalah pengkhotbah Rhema AI. Saat diminta khotbah: sampaikan LENGKAP ~5 menit — pembukaan, bacaan TB, 3 poin, aplikasi, doa penutup. " +
      RHEMA_ADDRESS_RULE,
  },
  theologian: {
    instruction: "Anda adalah Guru Teologi Rhema AI — eksposisi Alkitab, konteks historis, bahasa asli ringkas.",
  },
  worship_leader: {
    instruction: "Anda adalah Worship Leader Rhema AI — pimpin pujian, kidung, dan penyembahan dengan urapan.",
  },
  apostle_paul: {
    instruction: "Anda berbicara dengan gaya rasul Paulus — tegas, penuh iman, berdasarkan firman.",
  },
  prayer_intercessor: {
    instruction: "Anda adalah intercessor rohani — fokus doa syafaat dan deklarasi iman.",
  },
  kids_storyteller: {
    instruction: "Anda menceritakan kisah Alkitab untuk anak-anak — sederhana, hangat, penuh sukacita.",
  },
};

const PERSONAS_EN = {
  pastor: {
    instruction:
      "You are Rhema AI — a warm pastoral counselor grounded in Scripture. " + RHEMA_ADDRESS_RULE,
  },
  preacher: {
    instruction:
      "You are Rhema AI sermon assistant. When asked to preach: deliver a FULL ~5-minute sermon — greeting, KJV reading, three points (I, II, III), application, closing prayer. " +
      RHEMA_ADDRESS_RULE,
  },
  theologian: {
    instruction: "You are Rhema AI theologian — exposition, historical context, concise original-language insights.",
  },
  worship_leader: {
    instruction: "You are Rhema AI worship leader — guide praise, prayer, and worship with warmth.",
  },
  apostle_paul: {
    instruction: "Speak in the tone of the apostle Paul — bold, faith-filled, Scripture-rooted.",
  },
  prayer_intercessor: {
    instruction: "You are a prayer intercessor — focus on intercession and faith declarations.",
  },
  kids_storyteller: {
    instruction: "Tell Bible stories for children — simple, warm, joyful.",
  },
};

const ALKITAB_TOOLS = [
  {
    name: "lookup_verse",
    description: "Lookup offline Bible verse (TB for Indonesia, KJV for global). Example: John 3:16",
    parameters: {
      type: "object",
      properties: { reference: { type: "string" } },
      required: ["reference"],
    },
  },
  {
    name: "lookup_hymn",
    description: "Lookup lirik KJ atau BE offline. Contoh: KJ 1, BE 100",
    parameters: {
      type: "object",
      properties: {
        book: { type: "string" },
        number: { type: "number" },
      },
      required: ["book", "number"],
    },
  },
  {
    name: "lookup_passage",
    description: "Pasal TB dengan konteks, tafsir, cross-ref. Contoh: Yohanes 3:16",
    parameters: {
      type: "object",
      properties: {
        reference: { type: "string" },
        contextRadius: { type: "number" },
      },
      required: ["reference"],
    },
  },
  {
    name: "verify_verse",
    description: "Verifikasi kutipan ayat TB sebelum diucapkan.",
    parameters: {
      type: "object",
      properties: {
        reference: { type: "string" },
        quotedText: { type: "string" },
      },
      required: ["reference", "quotedText"],
    },
  },
  {
    name: "lookup_book_intro",
    description: "Pengantar kitab TB. Contoh: Yohanes, Mazmur",
    parameters: {
      type: "object",
      properties: { book: { type: "string" } },
      required: ["book"],
    },
  },
  {
    name: "lookup_tafsir",
    description: "Tafsir literatur untuk ayat TB.",
    parameters: {
      type: "object",
      properties: { reference: { type: "string" } },
      required: ["reference"],
    },
  },
  {
    name: "lookup_lexicon",
    description: "Kata asli Yunani/Ibrani untuk ayat TB.",
    parameters: {
      type: "object",
      properties: { reference: { type: "string" } },
      required: ["reference"],
    },
  },
  {
    name: "lookup_strongs",
    description: "Glossary Strong's — G26, H7965, dll.",
    parameters: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "search_tb",
    description: "Cari ayat/tema TB offline — semantic TF-IDF.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" },
        limit: { type: "number" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_session_metadata",
    description: "Metadata sesi: waktu lokal, timezone.",
    parameters: { type: "object", properties: {} },
  },
];

export function resolveVoiceProfile(id) {
  const key = id === "alkitab-voice" ? "alkitab-voice" : "rhema-ide";
  if (key === "alkitab-voice") {
    return {
      ...VOICE_PROFILES[key],
      instructions: buildAlkitabVoiceInstructions(),
      contextHint: buildAlkitabVoiceContextHint(),
    };
  }
  return VOICE_PROFILES[key];
}

export function resolvePersonaInstruction(personaId) {
  const personas = isIndonesiaProfile() ? PERSONAS_ID : PERSONAS_EN;
  return personas[personaId]?.instruction || personas.pastor.instruction;
}

function voiceToolsForProfile(profileId) {
  if (profileId === "alkitab-voice") return ALKITAB_TOOLS;
  return [
    {
      name: "get_session_metadata",
      description: "Metadata sesi live.",
      parameters: { type: "object", properties: {} },
    },
  ];
}

export function buildGeminiLiveSetup(options = {}) {
  const profileId = options.profileId === "alkitab-voice" ? "alkitab-voice" : "rhema-ide";
  const profile = resolveVoiceProfile(profileId);
  const personaInstruction =
    profileId === "alkitab-voice" ? resolvePersonaInstruction(options.personaId) + "\n\n" : "";
  const extra = profile.contextHint ? `\n\n${profile.contextHint}` : "";
  const timeCtx = `\n\n${buildLiveSessionTimeContext()}`;
  const instructions = personaInstruction + profile.instructions + extra + timeCtx;
  const modelId = resolveGeminiLiveModel();
  const voiceName = options.voiceName || RHEMA_VOICE_LOCKED.voiceName;

  const setup = {
    model: geminiModelResource(modelId),
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName } },
      },
    },
    systemInstruction: { parts: [{ text: instructions }] },
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    tools: [{ functionDeclarations: voiceToolsForProfile(profileId) }],
  };

  if (profileId === "alkitab-voice") {
    setup.contextWindowCompression = { triggerTokens: 25000, slidingWindow: { targetTokens: 12000 } };
    setup.realtimeInputConfig = {
      automaticActivityDetection: {
        endOfSpeechSensitivity: "END_SENSITIVITY_LOW",
        silenceDurationMs: 2800,
      },
    };
  }

  if (options.mobileLean) {
    delete setup.contextWindowCompression;
    delete setup.realtimeInputConfig;
    setup.tools = [
      {
        functionDeclarations: [
          {
            name: "get_session_metadata",
            description: "Waktu lokal & timezone perangkat — gunakan jika ditanya jam/tanggal.",
            parameters: { type: "object", properties: {} },
          },
          {
            name: "lookup_verse",
            description: "Lookup ayat TB offline.",
            parameters: {
              type: "object",
              properties: { reference: { type: "string" } },
              required: ["reference"],
            },
          },
        ],
      },
    ];
  }

  return setup;
}

export function buildSessionConfigResponse(options) {
  const profileId = options.profileId === "alkitab-voice" ? "alkitab-voice" : "rhema-ide";
  const voiceName = options.voiceName || RHEMA_VOICE_LOCKED.voiceName;
  const model = resolveGeminiLiveModel();
  return {
    wsUrl: geminiLiveWsUrl(options.apiKey),
    setup: buildGeminiLiveSetup({
      profileId,
      voiceName,
      personaId: options.personaId,
      mobileLean: options.mobileLean,
    }),
    model,
    profile: profileId,
    voiceName,
    voiceLocked: true,
    audioInputRate: GEMINI_LIVE_INPUT_RATE,
    audioOutputRate: GEMINI_LIVE_OUTPUT_RATE,
  };
}
