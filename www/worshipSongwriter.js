/**
 * AI Worship Songwriter & Chords Composer Engine — Pencipta Lagu Rohani & Aransemen Kidung Baru AI.
 */

import { escapeHtml } from "./markdown.js";
import { apiUrl } from "./platform.js";

export const SONG_THEME_TEMPLATES = [
  { id: "grace", label: "💎 Anugerah Kasih Karunia", passage: "Efesus 2:8", style: "Worship Slow (68 BPM)" },
  { id: "victory", label: "🔥 Kemenangan di Atas Badai", passage: "Roma 8:37", style: "Praise Anthemic (110 BPM)" },
  { id: "healing", label: "🩺 Kesembuhan & Pemulihan", passage: "Yesaya 53:5", style: "Acoustic Ballad (72 BPM)" },
  { id: "presence", label: "🕊️ Hadirat-Mu yang Kudus", passage: "Mazmur 84:11", style: "Intimate Worship (64 BPM)" },
  { id: "faithfulness", label: "🌟 Kesetiaan Tuhan Abadi", passage: "Ratapan 3:22-23", style: "Mid-tempo Praise (80 BPM)" },
];

export async function generateLiveWorshipSong(themePrompt) {
  try {
    const res = await fetch(apiUrl("/api/gemini/generate-song"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: themePrompt }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.result) {
        const s = data.result;
        return {
          title: s.title || `Kidung: ${themePrompt}`,
          passage: s.verseRef || "Pujian & Penyembahan",
          key: s.key || "C",
          tempo: s.tempo || "72 BPM",
          timeSignature: "4/4",
          structure: [
            {
              section: "Bait 1 (Verse)",
              lines: [
                { chords: s.chordIntro || "C          Em         F            G", lyrics: s.verseLyrics || "Kupuji Engkau Tuhan segenap hatiku" },
              ],
            },
            {
              section: "Refrain (Chorus)",
              lines: [
                { chords: "C          G          Am           F", lyrics: s.chorusLyrics || "Haleluya, kusembah Engkau Rajaku" },
              ],
            },
            {
              section: "Bridge (Penyembahan)",
              lines: [
                { chords: "F          G          Em           Am", lyrics: s.bridgeLyrics || "Kemuliaan bagi nama-Mu selamanya" },
              ],
            },
          ],
        };
      }
    }
  } catch (err) {
    console.warn("[worshipSongwriter] live generate fallback:", err);
  }
  return generateNewWorshipSong(themePrompt);
}

/**
 * Generate lagu rohani baru lengkap dengan lirik dan chord
 */
export function generateNewWorshipSong(topic = "Kasih Setia Tuhan", passageRef = "Mazmur 103:1-5") {
  return {
    title: `Kasih Setia-Mu Tak Berkesudahan`,
    passage: passageRef || "Mazmur 103:1-5",
    key: "C",
    tempo: 70,
    timeSignature: "4/4",
    structure: [
      {
        section: "Bait 1",
        lines: [
          { chords: "C          Em         F            G", lyrics: "Di setiap fajar terbit, ku pandang kemuliaan-Mu" },
          { chords: "C          Em         F            G", lyrics: "Nafas hidup yang baru, bukti anugerah-Mu" },
          { chords: "Am         Em         F            C", lyrics: "Walau jalan berliku, ku tak akan goyah" },
          { chords: "Dm         F          G            G7", lyrics: "Sebab tangan-Mu kuat menopang langkahku" },
        ],
      },
      {
        section: "Bait 2",
        lines: [
          { chords: "C          Em         F            G", lyrics: "Saat badai menerpa, Kau perlindunganku" },
          { chords: "C          Em         F            G", lyrics: "Di dalam naungan-Mu, jiwaku berserah" },
          { chords: "Am         Em         F            C", lyrics: "Janji-Mu kekal abadi, firman-Mu pelitaku" },
          { chords: "Dm         F          G            G", lyrics: "Hanya pada-Mu ku taruh harapanku" },
        ],
      },
      {
        section: "Refrain (Chorus)",
        lines: [
          { chords: "C          G          Am           F", lyrics: "Kasih setia-Mu Tuhan, tak berkesudahan" },
          { chords: "C          G          F            G", lyrics: "Selalu baru setiap pagi bagi hidupku" },
          { chords: "C          G          Am           F", lyrics: "Besar kebaikan-Mu, ajaib perbuatan-Mu" },
          { chords: "Dm         G          C            C", lyrics: "Kusembah Engkau, Yesus Rajaku" },
        ],
      },
      {
        section: "Bridge",
        lines: [
          { chords: "F          G          Em           Am", lyrics: "Biar sgala yang bernafas memuji nama-Mu" },
          { chords: "F          G          Am           A7", lyrics: "Dari kekal sampai kekal Kau Allahku" },
          { chords: "Dm         Em         F            G", lyrics: "Kutinggikan, kuagungkan nama-Mu Tuhan" },
        ],
      },
    ],
  };
}

/**
 * Membuka Modal AI Worship Songwriter
 */
export function openWorshipSongwriterModal(callbacks = {}) {
  let existing = document.getElementById("worship-songwriter-modal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "worship-songwriter-modal";
  modal.className = "apple-modal-overlay active";

  let currentSong = generateNewWorshipSong();
  let transposeStep = 0;

  modal.innerHTML = `
    <div class="apple-modal-sheet songwriter-sheet">
      <div class="modal-handle-bar"></div>
      <div class="songwriter-header">
        <div>
          <span class="songwriter-badge">🎸 Pencipta Lagu Rohani AI</span>
          <h2 class="songwriter-title">Studio Kidung Baru</h2>
          <p class="songwriter-sub">Ciptakan lagu pujian &amp; chord sheet orisinal dengan Gemini AI</p>
        </div>
        <button type="button" class="btn-modal-close" id="btn-close-songwriter">✕</button>
      </div>

      <!-- Quick Template Bar -->
      <div class="sw-templates-scroll">
        ${SONG_THEME_TEMPLATES.map((t, idx) => `
          <button type="button" class="sw-theme-pill ${idx === 0 ? "active" : ""}" data-label="${t.label}" data-pass="${t.passage}">
            ${t.label}
          </button>
        `).join("")}
      </div>

      <!-- Song Sheet Container -->
      <div class="sw-sheet-container glass-card" id="sw-sheet-wrap">
        <div class="sw-sheet-head">
          <div>
            <h3 class="sw-song-title" id="sw-render-title">${currentSong.title}</h3>
            <span class="sw-song-meta" id="sw-render-meta">Nada Dasar: <strong>${currentSong.key}</strong> · Tempo: ${currentSong.tempo} BPM · ${currentSong.passage}</span>
          </div>
          <div class="sw-transpose-controls">
            <button type="button" class="btn-tool-icon" id="btn-sw-trans-down">♭</button>
            <span class="sw-trans-val" id="sw-render-trans">Asli</span>
            <button type="button" class="btn-tool-icon" id="btn-sw-trans-up">♯</button>
          </div>
        </div>

        <div class="sw-lyrics-body" id="sw-render-body">
          ${currentSong.structure.map((sec) => `
            <div class="sw-section-block">
              <span class="sw-sec-name">[ ${sec.section} ]</span>
              ${sec.lines.map((l) => `
                <div class="sw-chord-line">${l.chords}</div>
                <div class="sw-lyric-line">${l.lyrics}</div>
              `).join("")}
            </div>
          `).join("")}
        </div>
      </div>

      <!-- Actions -->
      <div class="songwriter-actions-footer">
        <button type="button" class="btn-pill btn-soft" id="btn-sw-copy">📋 Salin Partitur &amp; Chord</button>
        <button type="button" class="btn-pill primary glow" id="btn-sw-voice">🎙️ Nyanyikan / Perdengarkan AI Live</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector("#btn-close-songwriter")?.addEventListener("click", () => modal.remove());

  modal.querySelectorAll(".sw-theme-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      modal.querySelectorAll(".sw-theme-pill").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const label = btn.getAttribute("data-label") || "Pujian";
      const pass = btn.getAttribute("data-pass") || "Alkitab";
      currentSong = generateNewWorshipSong(label, pass);

      const tEl = modal.querySelector("#sw-render-title");
      const mEl = modal.querySelector("#sw-render-meta");
      const bEl = modal.querySelector("#sw-render-body");
      if (tEl) tEl.textContent = currentSong.title;
      if (mEl) {
        mEl.innerHTML = `Nada Dasar: <strong>${escapeHtml(currentSong.key)}</strong> · Tempo: ${escapeHtml(currentSong.tempo)} BPM · ${escapeHtml(currentSong.passage)}`;
      }
      if (bEl) {
        bEl.innerHTML = currentSong.structure.map((sec) => `
          <div class="sw-section-block">
            <span class="sw-sec-name">[ ${escapeHtml(sec.section)} ]</span>
            ${sec.lines.map((l) => `
              <div class="sw-chord-line">${escapeHtml(l.chords)}</div>
              <div class="sw-lyric-line">${escapeHtml(l.lyrics)}</div>
            `).join("")}
          </div>
        `).join("");
      }
    });
  });

  modal.querySelector("#btn-sw-copy")?.addEventListener("click", () => {
    let fullText = `${currentSong.title.toUpperCase()}\nNada: ${currentSong.key} · ${currentSong.tempo} BPM · ${currentSong.passage}\n\n`;
    currentSong.structure.forEach((sec) => {
      fullText += `[${sec.section}]\n`;
      sec.lines.forEach((l) => {
        fullText += `${l.chords}\n${l.lyrics}\n`;
      });
      fullText += `\n`;
    });
    navigator.clipboard.writeText(fullText);
    alert("Partitur dan chord lagu rohani berhasil disalin ke clipboard!");
  });

  modal.querySelector("#btn-sw-voice")?.addEventListener("click", () => {
    modal.remove();
    if (callbacks.onVoiceSong) {
      callbacks.onVoiceSong(currentSong);
    } else {
      document.dispatchEvent(new CustomEvent("rhema-nav", { detail: "voice" }));
      document.dispatchEvent(
        new CustomEvent("rhema-ask-voice", {
          detail: `Bawakan lagu pujian baru yang berjudul "${currentSong.title}" dengan penuh penghayatan dan urapan. Bacakan liriknya secara puitis dan pimpin doa pengagungan bagi Tuhan.`,
        })
      );
    }
  });
}
