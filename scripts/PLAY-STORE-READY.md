# Rhema AI — Rangkuman Play Store (siap salin)

**Package:** `id.rhema.alkitabvoice` · **Version:** 1.0.0 · **Format upload:** AAB signed  
**Terakhir diperbarui:** 11 September 2026

---

## Status akun

- [ ] Verifikasi identitas Google Play Console (KTP) — **menunggu email Google**
- [x] Privacy policy: https://kanzapro71.github.io/rhema-ai-privacy/
- [x] targetSdk 36 · AAB release ~19.5 MB
- [x] BYOK + Gemini Live WebSocket validation
- [x] Bilingual UI + auto region (LocaleManager native + JS)
- [x] EncryptedSharedPreferences (SecureKeyPlugin)

---

## Main Store Listing

**Default language:** English (United States)  
**Add translation:** Indonesian (Indonesia)  
**Countries:** All countries and regions

| Field | Indonesia (id-ID) | English (en-US) default |
|-------|-------------------|-------------------------|
| **Title** (30) | Rhema AI: Renungan & Khotbah | Rhema AI: Audio Devotion |
| **Short** (80) | Asisten teduh & khotbah Alkitab via suara Full Duplex bertenaga Gemini AI. | Your Full Duplex voice companion for KJV Bible devotions & sermon outlines. |

**File lengkap:** `scripts/play-store-descriptions-bilingual.txt`

---

## What's New v1.0.0 (max 500 karakter)

**File:** `scripts/play-store-whats-new-v1.0.0.txt`

### Indonesia (478/500)

```
• Rilis Perdana Rhema AI: Pendamping ibadah & asisten persiapan khotbah pintar.
• Fitur Suara Full Duplex: Mengobrol langsung secara natural dengan asisten AI berbasis Gemini 3.1 Flash Live Preview.
• Sistem BYOK Aman: Gunakan API Key Gemini gratis Anda sendiri, dienkripsi 100% lokal di perangkat.
• Dukungan Multibahasa Otomatis: Sinkronisasi instan Alkitab untuk Indonesia dan King James Version (KJV) untuk pengguna global berdasarkan wilayah perangkat.
```

### English (435/500)

```
• Initial Release of Rhema AI: Your intelligent devotional & sermon preparation companion.
• Full Duplex Voice: Natural, fluid two-way audio conversations powered by Gemini 3.1 Flash Live Preview.
• Secure BYOK Support: Use your own free Gemini API Key, encrypted 100% locally on your device.
• Automated Bilingual Logic: Seamlessly switches between Indonesian Bible and Global English (KJV) based on your system locale.
```

---

## Upload AAB

```powershell
cd "d:\Rhema AI"
npm run android:release
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

---

## Data Safety (ringkas)

| Data | Koleksi | Shared | Purpose |
|------|---------|--------|---------|
| Microphone / audio | Saat voice live | Google (user API key) | App functionality |
| Chat / renungan / transkrip | Saat AI dipakai | Google (user API key) | App functionality |
| Photos | Saat Vision Lens | Google (user API key) | App functionality |
| API key | On device only (EncryptedSharedPreferences) | Tidak ke server Rhema | App functionality |
| Notes / highlights / jurnal | Local WebView | Tidak ke Rhema; jurnal bisa ke Google jika user minta didoakan | App functionality |

Encryption in transit: **Yes** (HTTPS/WSS)  
Users can delete data: **Yes** (Clear data / uninstall / hapus key di Settings)

---

## Hak cipta (catatan reviewer)

- **KJV:** Public Domain — aman global
- **Alkitab:** Offline study tool interface; BYOK ke Google untuk AI — bukan penerbit Alkitab

---

## Arsitektur bilingual (teknis)

| Pilar | Implementasi |
|-------|--------------|
| UI | `www/uiStrings.js` + `data-i18n` (folder `values-in` tidak dipakai) |
| Auto region boot | `LocaleManager.java` → `DeviceLocale` plugin → `bootstrapAutoRegionIfNeeded()` |
| AI prompt | `voiceProfiles.js` + `localeProfile.js` → WebSocket `systemInstruction` |
| Key security | `SecureKeyPlugin.java` (EncryptedSharedPreferences) |
| Live validation | `GeminiLivePlugin.probeLiveKey()` + `byokLiveValidate.js` |

---

## Checklist sebelum Production

1. [ ] Email verifikasi Google diterima
2. [ ] Paste store listing EN (default) + ID (translation)
3. [ ] Paste What's New EN + ID
4. [ ] Privacy policy URL
5. [ ] Screenshot 4–8 (phone)
6. [ ] Feature graphic 1024×500 + icon 512×512
7. [ ] Internal testing → closed testing → production
8. [ ] Deploy privacy terbaru: `.\scripts\deploy-privacy-github.ps1`

---

## File penting di repo

| File | Isi |
|------|-----|
| `scripts/play-store-descriptions-bilingual.txt` | Judul + short + long description |
| `scripts/play-store-whats-new-v1.0.0.txt` | Release notes v1.0.0 |
| `scripts/play-store-listing-rhema.txt` | Checklist + data safety + permissions |
| `www/privacy.html` | Kebijakan privasi ID/EN |
| `scripts/build-play-release.ps1` | Build AAB release |

---

## Kuota API Key (pesan untuk user awam)

- Tunggu ~1 menit jika suara terputus (error 429)
- Buat key baru di Google AI Studio jika perlu
- Key gratis cukup untuk ibadah pribadi
- Key dienkripsi di HP — tidak ke server Rhema

---

*Devi Core / app lain: gunakan store listing terpisah; tambahkan section AdMob jika app ber-iklan.*
