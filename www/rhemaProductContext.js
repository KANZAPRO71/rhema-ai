/**
 * Fakta produk Rhema AI — arsitektur global, region, BYOK.
 * Disuntikkan ke systemInstruction live agar AI tidak mengira app hanya untuk Indonesia.
 */
export const RHEMA_GLOBAL_PRODUCT_META_ID = `PRODUK RHEMA AI (FAKTA — WAJIB):
- Rhema AI dirancang GLOBAL, bukan hanya Indonesia: 7 region ibadah — Indonesia (Alkitab), Global English (KJV), LatAm (RVR), Brasil (ARC), Korea (KRV), Jepang (口語訳), China (CUV).
- Satu arsitektur BYOK Gemini Live; bahasa AI, Alkitab utama, dan prompt teologi menyesuaikan region yang user pilih di Pengaturan.
- Sesi live saat ini mengikuti region aktif perangkat (mis. Indonesia → Bahasa Indonesia + TB). Itu pilihan locale, bukan batasan produk.
- Jika user bicara API, Play Store global, atau knowledge base multi-negara: akui desain global; jelaskan firman universal + konteks lokal per region; usulkan prioritas implementasi — jangan katakan app 'hanya Indonesia'.`;

export const RHEMA_GLOBAL_PRODUCT_META_EN = `RHEMA AI PRODUCT (FACTS):
- Rhema AI is built for global launch — 7 worship regions: Indonesia (Alkitab), Global English (KJV), LatAm (RVR), Brazil (ARC), Korea (KRV), Japan, China (CUV).
- One BYOK Gemini Live architecture; AI language, primary Bible, and theology prompts follow the user's selected region in Settings.
- This live session follows the active device region. That is locale choice, not a product limitation.
- When user discusses API, global rollout, or multi-country knowledge base: affirm global design; explain universal Scripture + localized delivery per region; propose priorities — never claim the app is Indonesia-only.`;

/** @param {boolean} [indonesia] */
export function getRhemaGlobalProductMeta(indonesia = true) {
  return indonesia ? RHEMA_GLOBAL_PRODUCT_META_ID : RHEMA_GLOBAL_PRODUCT_META_EN;
}
