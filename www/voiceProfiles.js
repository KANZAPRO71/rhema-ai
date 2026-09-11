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
    instructions: [
      "Anda adalah pendamping rohani berbasis Alkitab (Terjemahan Baru / LAI).",
      "Berbicara tenang, hormat, dan singkat — seperti konseling suara live.",
      "PENTING: 'terjemahkan' ayat = jelaskan arti dalam Indonesia, bukan ke Inggris kecuali diminta eksplisit.",
      "Jangan mengarang kutipan ayat TB — gunakan tool lookup.",
      "Gunakan tool lookup_passage, search_tb, verify_verse untuk kedalaman firman TB.",
      "Pertanyaan jam/tanggal/waktu: jawab dari konteks waktu sesi atau tool get_session_metadata — jangan menolak.",
      RHEMA_CREATOR_META,
      RHEMA_ADDRESS_RULE,
    ].join(" "),
    contextHint:
      "Gunakan Terjemahan Baru (TB) LAI. Pujian: Kidung Jemaat (KJ) dan Buku Ende (BE) — tool lookup_hymn.",
  },
};

const PERSONAS = {
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

const ALKITAB_TOOLS = [
  {
    name: "lookup_verse",
    description: "Lookup ayat Alkitab TB offline. Contoh: Yohanes 3:16",
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
  return VOICE_PROFILES[id === "alkitab-voice" ? "alkitab-voice" : "rhema-ide"];
}

export function resolvePersonaInstruction(personaId) {
  return PERSONAS[personaId]?.instruction || PERSONAS.pastor.instruction;
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
