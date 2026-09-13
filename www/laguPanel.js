import { getHymn, getHymnEntry, loadHymn, getHymnsByBook, hymnOfTheDay, searchHymns, HYMN_BOOKS } from "./laguData.js";
import { playPitchPipe } from "./ambientAudio.js";
import {
  INSTRUMENT_PROFILES,
  playChordByInstrument,
  setAccompanimentInstrument,
  getAccompanimentInstrument,
  setAccompanimentContext,
  toggleContinuousWorshipPad,
  stopContinuousWorshipPad,
  isContinuousPadActive,
  toggleWorshipAccompanist,
  stopWorshipAccompanist,
  isAccompanistActive,
  warmupWorshipEngine,
} from "./worshipAccompanist.js";
import { buildSongArrangement } from "./songArrangement.js";
import {
  parseChordPro,
  hasChordProMarkers,
  distributeChordsToLyrics,
  renderChordProRows,
  wireChordBadgeClicks,
} from "./chordPro.js";
import { escapeHtml } from "./markdown.js";

const FAV_KEY = "rhema-lagu-favorites";

function loadFavs() {
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveFavs(list) {
  localStorage.setItem(FAV_KEY, JSON.stringify(list.slice(0, 30)));
}

/** @type {{ id: string, book: string, no: number, title: string, lyrics: string, chord?: string, key?: string } | null} */
let currentSong = null;
let currentTranspose = 0; // semitone offset
let autoScrollTimer = null;
let isAutoScrolling = false;
let isChordModeActive = false;
let isMetronomeActive = false;
let metronomeTimer = null;
let metronomeBpm = 72;
let metronomeBeat = 0;

const CHROMATIC_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const CHROMATIC_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

function transposeNote(note, semitones) {
  let idx = CHROMATIC_SHARP.indexOf(note);
  if (idx === -1) idx = CHROMATIC_FLAT.indexOf(note);
  if (idx === -1) return note;
  const newIdx = (idx + semitones + 24) % 12;
  return CHROMATIC_SHARP[newIdx];
}

function transposeChords(chordText, semitones) {
  if (!chordText || semitones === 0) return chordText;
  return chordText.replace(/\b([A-G][#b]?)(m|maj|min|dim|aug|sus[24]?|[0-9]+)?/g, (match, root, suffix) => {
    return transposeNote(root, semitones) + (suffix || "");
  });
}

function playMetronomeClick(accent = false) {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(accent ? 1300 : 850, now);
    gain.gain.setValueAtTime(accent ? 0.35 : 0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  } catch {}
}

function toggleMetronome() {
  const btn = document.getElementById("btn-lagu-metronome");
  if (isMetronomeActive) {
    if (metronomeTimer) clearInterval(metronomeTimer);
    metronomeTimer = null;
    isMetronomeActive = false;
    if (btn) {
      btn.innerHTML = `⏱ Metronom (${metronomeBpm})`;
      btn.classList.remove("active");
    }
  } else {
    isMetronomeActive = true;
    if (btn) {
      btn.innerHTML = `⏱ Tik: ${metronomeBpm} BPM`;
      btn.classList.add("active");
    }
    metronomeBeat = 0;
    const intervalMs = (60 / metronomeBpm) * 1000;
    playMetronomeClick(true);
    metronomeTimer = setInterval(() => {
      metronomeBeat = (metronomeBeat + 1) % 4;
      playMetronomeClick(metronomeBeat === 0);
    }, intervalMs);
  }
}

function getCurrentArrangement() {
  if (!currentSong) {
    return buildSongArrangement({ id: "default", book: "KJ", key: "C" }, currentTranspose);
  }
  return buildSongArrangement(currentSong, currentTranspose);
}

function applySongArrangementDefaults() {
  const arr = getCurrentArrangement();
  setAccompanimentInstrument(arr.instrument);
  setAccompanimentContext({ baseOctave: arr.baseOctave, bpm: arr.bpm, instrument: arr.instrument });
  metronomeBpm = arr.bpm;
}

function renderSongDetails() {
  if (!currentSong) return;
  const badge = document.getElementById("lagu-detail-badge");
  const title = document.getElementById("lagu-detail-title");
  const meta = document.getElementById("lagu-detail-meta");
  const lyrics = document.getElementById("lagu-detail-lyrics");
  const chord = document.getElementById("lagu-detail-chord");
  const transposeVal = document.getElementById("lagu-transpose-val");

  if (badge) badge.textContent = currentSong.book;
  if (title) title.textContent = `${currentSong.book} ${currentSong.no} — ${currentSong.title}`;

  const arr = getCurrentArrangement();
  const baseKey = currentSong.key || "C";
  const transposedKey = arr.key || transposeNote(baseKey, currentTranspose);
  const profileForMeta = INSTRUMENT_PROFILES.find((p) => p.id === arr.instrument) || INSTRUMENT_PROFILES[0];
  if (meta) {
    const transposeLabel = currentTranspose !== 0 ? ` (${currentTranspose > 0 ? "+" : ""}${currentTranspose})` : "";
    meta.textContent = `Nada: ${transposedKey}${transposeLabel} · ${arr.bpm} BPM · ${profileForMeta.label.replace(/^[^\s]+\s/, "")}`;
  }

  const rawChord = currentSong.chord || "C G Am F";
  const transposedChordStr = transposeChords(rawChord, currentTranspose);
  const currentInst = getAccompanimentInstrument();
  const profile = INSTRUMENT_PROFILES.find((p) => p.id === currentInst) || INSTRUMENT_PROFILES[0];
  const instIcon = profile.icon;
  const instName = profile.label;

  if (lyrics) {
    const lines = currentSong.lyrics.split("\n");
    if (isChordModeActive) {
      const progression = (currentSong.progression && currentSong.progression.length)
        ? currentSong.progression.map((c) => transposeNote(c, currentTranspose))
        : transposedChordStr.split(/\s+/).filter(Boolean);

      let rows;
      if (hasChordProMarkers(currentSong.lyrics)) {
        rows = parseChordPro(currentSong.lyrics).map((row) => ({
          chords: row.chords.map((c) => transposeChords(c, currentTranspose)),
          lyric: row.lyric,
        }));
      } else {
        rows = distributeChordsToLyrics(currentSong.lyrics, progression);
      }

      lyrics.innerHTML = renderChordProRows(rows, { instName, instIcon });
      wireChordBadgeClicks(lyrics, (chordName) => playChordByInstrument(chordName, currentInst));
    } else {
      lyrics.innerHTML = lines
        .map((l, idx) => `<div class="lyrics-line-item" data-line-idx="${idx}">${escapeHtml(l) || "&nbsp;"}</div>`)
        .join("");
    }
  }

  if (chord) {
    const chordsArr = transposedChordStr.split(/\s+/).filter(Boolean);
    chord.innerHTML = `
      <div class="chord-interactive-wrap">
        <div class="chord-head-bar">
          <span class="chord-label">${instIcon} Suara Akor: <strong>${escapeHtml(instName)}</strong></span>
          <span class="chord-sub-desc">${escapeHtml(profile.desc)}</span>
        </div>
        <div class="chord-badges-bar">
          ${chordsArr.map((c) => `<button type="button" class="interactive-chord-pill" data-chord="${escapeHtml(c)}">${instIcon} ${escapeHtml(c)}</button>`).join(" ")}
        </div>
      </div>
    `;
    chord.querySelectorAll(".interactive-chord-pill").forEach((btn) => {
      btn.addEventListener("click", () => {
        const chordName = btn.getAttribute("data-chord") || "C";
        playChordByInstrument(chordName, currentInst);
        btn.classList.add("strummed");
        setTimeout(() => btn.classList.remove("strummed"), 400);
      });
    });
  }

  if (transposeVal) {
    transposeVal.textContent = currentTranspose === 0 ? "Asli" : `${currentTranspose > 0 ? "+" : ""}${currentTranspose}`;
  }
  updateFavBtn();
}

function toggleAutoScroll() {
  const btn = document.getElementById("btn-lagu-autoscroll");
  const scrollContainer =
    document.querySelector("#screen-lagu .mobile-scroll") ||
    document.querySelector(".mobile-scroll") ||
    document.documentElement;

  if (isAutoScrolling) {
    if (autoScrollTimer) clearInterval(autoScrollTimer);
    autoScrollTimer = null;
    isAutoScrolling = false;
    if (btn) {
      btn.innerHTML = "▶ Auto-Scroll";
      btn.classList.remove("active");
    }
  } else {
    isAutoScrolling = true;
    if (btn) {
      btn.innerHTML = "⏸ Berhenti";
      btn.classList.add("active");
    }
    autoScrollTimer = setInterval(() => {
      let scrolled = false;
      if (scrollContainer && scrollContainer.scrollHeight > scrollContainer.clientHeight) {
        scrollContainer.scrollTop += 1.5;
        scrolled = true;
        if (scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 6) {
          toggleAutoScroll();
          return;
        }
      }
      if (!scrolled) {
        window.scrollBy(0, 1.5);
        document.documentElement.scrollTop += 1.5;
        document.body.scrollTop += 1.5;
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 6) {
          toggleAutoScroll();
        }
      }
    }, 40);
  }
}

function stopAutoScroll() {
  if (isAutoScrolling) {
    if (autoScrollTimer) clearInterval(autoScrollTimer);
    autoScrollTimer = null;
    isAutoScrolling = false;
    const btn = document.getElementById("btn-lagu-autoscroll");
    if (btn) {
      btn.innerHTML = "▶ Auto-Scroll";
      btn.classList.remove("active");
    }
  }
}

async function showSong(id) {
  const entry = getHymnEntry(id);
  const detail = document.getElementById("lagu-detail");
  if (!entry || !detail) return;

  currentSong = getHymn(id);
  currentTranspose = 0;
  stopAutoScroll();

  document.getElementById("lagu-list")?.classList.add("hidden");
  detail.classList.remove("hidden");
  notifySubView(true);

  const lyricsEl = document.getElementById("lagu-detail-lyrics");
  if (lyricsEl) lyricsEl.textContent = "Memuat lirik…";

  const full = await loadHymn(entry.id);
  if (!full) return;
  currentSong = full;
  applySongArrangementDefaults();
  renderSongDetails();
}

let isPrompterRunning = false;
let prompterStepTimer = null;
let currentPrompterLineIdx = 0;

function stopLyricPrompter() {
  if (prompterStepTimer) {
    clearTimeout(prompterStepTimer);
    prompterStepTimer = null;
  }
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  isPrompterRunning = false;
  currentPrompterLineIdx = 0;

  document.querySelectorAll(".lyrics-line-item.active-prompter-line").forEach((el) => {
    el.classList.remove("active-prompter-line");
  });

  const btn = document.getElementById("btn-lagu-prompter");
  const voiceBtn = document.getElementById("btn-lagu-voice");
  if (btn) {
    btn.innerHTML = "🗣️ AI Pandu Lirik";
    btn.classList.remove("active");
  }
  if (voiceBtn) {
    voiceBtn.innerHTML = "🎙️ Pimpin Pujian Bersama AI";
    voiceBtn.classList.remove("active");
  }
}

function startLyricPrompter() {
  if (!currentSong) return;
  stopLyricPrompter();

  // Ambil hanya baris lirik yang bermakna (tanpa baris kosong)
  const rawLines = currentSong.lyrics
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (!rawLines.length) return;

  isPrompterRunning = true;
  currentPrompterLineIdx = 0;

  const btn = document.getElementById("btn-lagu-prompter");
  const voiceBtn = document.getElementById("btn-lagu-voice");
  const accBtn = document.getElementById("btn-lagu-accompany");

  if (btn) {
    btn.innerHTML = "⏹️ Hentikan Pandu Lirik";
    btn.classList.add("active");
  }
  if (voiceBtn) {
    voiceBtn.innerHTML = "⏹️ Hentikan Pimpinan Pujian";
    voiceBtn.classList.add("active");
  }

  // 1. Jalankan musik iringan otomatis — aransemen unik per lagu
  const arrangement = getCurrentArrangement();
  const inst = getAccompanimentInstrument();
  const profile = INSTRUMENT_PROFILES.find((p) => p.id === inst) || INSTRUMENT_PROFILES[0];

  if (!isAccompanistActive()) {
    toggleWorshipAccompanist(arrangement, (chordName, idx, total) => {
      if (accBtn) accBtn.innerHTML = `${profile.icon} Bar ${idx + 1}/${total}: <strong>${escapeHtml(chordName)}</strong>`;
      document.querySelectorAll(`[data-chord="${chordName}"]`).forEach((b) => {
        b.classList.add("strummed");
        setTimeout(() => b.classList.remove("strummed"), 400);
      });
    }, inst);
    if (accBtn) accBtn.classList.add("active");
  }

  // 2. Jalankan Auto-Scroll
  if (!isAutoScrolling) {
    toggleAutoScroll();
  }

  // 3. Eksekusi Pembacaan Baris Demi Baris Sesuai Tempo Lagu
  function stepPrompter() {
    if (!isPrompterRunning || !currentSong) return;

    if (currentPrompterLineIdx >= rawLines.length) {
      // LAGU SELESAI: AI ucapkan Amin, musik berhenti otomatis
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const closing = new SpeechSynthesisUtterance("Amin... Terpujilah Tuhan.");
        closing.lang = "id-ID";
        closing.rate = 0.85;
        closing.volume = 0.70;
        closing.onend = () => {
          stopLyricPrompter();
          stopWorshipAccompanist();
          stopAutoScroll();
          if (accBtn) {
            accBtn.classList.remove("active");
            accBtn.innerHTML = `${profile.icon} Iringi ${escapeHtml(profile.label.split(" ")[1] || "Pujian")} AI`;
          }
        };
        window.speechSynthesis.speak(closing);
      } else {
        stopLyricPrompter();
        stopWorshipAccompanist();
        stopAutoScroll();
        if (accBtn) {
          accBtn.classList.remove("active");
          accBtn.innerHTML = `${profile.icon} Iringi ${escapeHtml(profile.label.split(" ")[1] || "Pujian")} AI`;
        }
      }
      return;
    }

    const currentLineText = rawLines[currentPrompterLineIdx];
    const isSectionHeader = /^Reff:?$/i.test(currentLineText) || /^Bait \d+:?$/i.test(currentLineText);

    // Sorot baris lirik aktif di layar
    document.querySelectorAll(".lyrics-line-item").forEach((el) => {
      el.classList.remove("active-prompter-line");
      if (el.textContent.trim() === currentLineText) {
        el.classList.add("active-prompter-line");
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });

    // Ucapkan HANYA baris ini saja
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const speakText = isSectionHeader
        ? (currentLineText.toLowerCase().includes("reff") ? "Refren..." : currentLineText)
        : currentLineText;

      const utter = new SpeechSynthesisUtterance(speakText);
      utter.lang = "id-ID";
      utter.rate = isSectionHeader ? 0.82 : 0.88;
      utter.pitch = 0.95;
      utter.volume = isSectionHeader ? 0.65 : 0.75;

      const voices = window.speechSynthesis.getVoices();
      const idVoice = voices.find((v) =>
        (v.lang.startsWith("id") || v.lang.includes("ID") || /indonesia/i.test(v.name)) &&
        (/natural|online|google|neural/i.test(v.name))
      ) || voices.find((v) => v.lang.startsWith("id") || v.lang.includes("ID") || /indonesia/i.test(v.name));

      if (idVoice) utter.voice = idVoice;

      window.speechSynthesis.speak(utter);
    }

    currentPrompterLineIdx++;

    // Jeda musik: 5.5 detik untuk lirik biasa (waktu bernyanyi bagi user), 2.0 detik untuk judul Reff/Bait
    const singingPauseMs = isSectionHeader ? 2000 : 5500;
    prompterStepTimer = setTimeout(stepPrompter, singingPauseMs);
  }

  // Mulai baris pertama
  stepPrompter();
}

function toggleLyricPrompter() {
  if (isPrompterRunning) {
    stopLyricPrompter();
    stopWorshipAccompanist();
    stopAutoScroll();
    const accBtn = document.getElementById("btn-lagu-accompany");
    if (accBtn) {
      accBtn.classList.remove("active");
      const inst = getAccompanimentInstrument();
      const profile = INSTRUMENT_PROFILES.find((p) => p.id === inst) || INSTRUMENT_PROFILES[0];
      accBtn.innerHTML = `${profile.icon} Iringi ${escapeHtml(profile.label.split(" ")[1] || "Pujian")} AI`;
    }
  } else {
    startLyricPrompter();
  }
}

function hideDetail() {
  stopAutoScroll();
  stopWorshipAccompanist();
  stopContinuousWorshipPad();
  stopLyricPrompter();
  const voiceBtn = document.getElementById("btn-lagu-voice");
  if (voiceBtn) {
    voiceBtn.innerHTML = "🎙️ Pimpin Pujian Bersama AI";
    voiceBtn.classList.remove("active");
  }
  const accBtn = document.getElementById("btn-lagu-accompany");
  const droneBtn = document.getElementById("btn-lagu-drone-pad");
  if (droneBtn) {
    droneBtn.classList.remove("active");
    droneBtn.innerHTML = "✨ Suasana Pad";
  }
  if (accBtn) {
    accBtn.classList.remove("active");
    const inst = getAccompanimentInstrument();
    const profile = INSTRUMENT_PROFILES.find((p) => p.id === inst) || INSTRUMENT_PROFILES[0];
    accBtn.innerHTML = `${profile.icon} Iringi ${escapeHtml(profile.label.split(" ")[1] || "Pujian")} AI`;
  }
  document.getElementById("lagu-detail")?.classList.add("hidden");
  document.getElementById("lagu-list")?.classList.remove("hidden");
  currentSong = null;
  notifySubView(false);
}

function renderHomeKidung(container) {
  if (!container) return;
  const hot = hymnOfTheDay();
  const picks = searchHymns("").slice(0, 3);
  container.innerHTML = picks
    .map(
      (h) => `
    <button type="button" class="card-list-item" data-id="${escapeHtml(h.id)}">
      <span class="item-icon">🎵</span>
      <span class="item-body">
        <span class="item-title">${escapeHtml(h.book)} ${h.no} — ${escapeHtml(h.title)}</span>
        <span class="item-sub">${h.id === hot.id ? "Rekomendasi hari ini" : "Kidung pujian"}</span>
      </span>
    </button>`,
    )
    .join("");
  container.querySelectorAll("[data-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.dispatchEvent(new CustomEvent("rhema-open-lagu", { detail: btn.getAttribute("data-id") }));
    });
  });
}

function renderList(hymns) {
  const list = document.getElementById("lagu-list");
  if (!list) return;
  if (!hymns.length) {
    list.innerHTML = `<p class="mobile-note">Lagu atau lirik tidak ditemukan.</p>`;
    return;
  }
  list.innerHTML = hymns
    .map(
      (h) => `
    <button type="button" class="card-list-item" data-id="${escapeHtml(h.id)}">
      <span class="item-icon">${h.book === "BE" ? "📕" : "📗"}</span>
      <span class="item-body">
        <span class="item-title">${escapeHtml(h.book)} ${h.no} — ${escapeHtml(h.title)}</span>
        <span class="item-sub">Nada: ${escapeHtml(h.key || "—")}${h.chord ? ` · ${escapeHtml(h.chord)}` : ""}</span>
        ${h.snippet ? `<span class="item-snippet-match">"${escapeHtml(h.snippet)}"</span>` : ""}
      </span>
    </button>`,
    )
    .join("");
  list.querySelectorAll("[data-id]").forEach((btn) => {
    btn.addEventListener("click", () => showSong(btn.getAttribute("data-id") || ""));
  });
}

function notifySubView(open) {
  document.dispatchEvent(new CustomEvent("rhema-subview", { detail: { id: "lagu-detail", open } }));
}

function updateFavBtn() {
  const btn = document.getElementById("btn-lagu-fav");
  if (!btn || !currentSong) return;
  const on = loadFavs().some((f) => f.id === currentSong.id);
  btn.textContent = on ? "★ Favorit" : "☆ Favorit";
  btn.classList.toggle("active", on);
}

/** @param {import("../shared/chatCore.js").ChatTransport} transport */
export function initLaguPanel(transport) {
  warmupWorshipEngine();
  const searchInput = document.getElementById("lagu-search");
  const homeList = document.getElementById("home-kidung-list");

  let activeBookFilter = "all";

  function refreshLaguList() {
    hideDetail();
    const query = searchInput?.value?.trim() || "";
    if (query) {
      const results = searchHymns(query);
      if (activeBookFilter === "all") renderList(results);
      else renderList(results.filter((h) => h.book.toUpperCase() === activeBookFilter.toUpperCase()));
    } else {
      renderList(getHymnsByBook(activeBookFilter));
    }
  }

  renderHomeKidung(homeList);
  refreshLaguList();

  // Listener Laci Pilihan Buku Nyanyian
  document.querySelectorAll(".lagu-books-bar .book-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".lagu-books-bar .book-pill").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeBookFilter = btn.getAttribute("data-book") || "all";
      refreshLaguList();
    });
  });

  document.getElementById("btn-lagu-search")?.addEventListener("click", refreshLaguList);

  searchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") refreshLaguList();
  });

  document.getElementById("btn-lagu-transpose-down")?.addEventListener("click", () => {
    if (!currentSong) return;
    currentTranspose--;
    applySongArrangementDefaults();
    renderSongDetails();
  });

  document.getElementById("btn-lagu-transpose-reset")?.addEventListener("click", () => {
    if (!currentSong) return;
    currentTranspose = 0;
    applySongArrangementDefaults();
    renderSongDetails();
  });

  document.getElementById("btn-lagu-transpose-up")?.addEventListener("click", () => {
    if (!currentSong) return;
    currentTranspose++;
    applySongArrangementDefaults();
    renderSongDetails();
  });

  // Tombol Ganti Instrumen (Modern Pad, Organ Pipa, Shimmer Piano, Gitar)
  document.getElementById("btn-lagu-inst")?.addEventListener("click", () => {
    const currentInst = getAccompanimentInstrument();
    const curIdx = INSTRUMENT_PROFILES.findIndex((p) => p.id === currentInst);
    const nextProfile = INSTRUMENT_PROFILES[(curIdx + 1) % INSTRUMENT_PROFILES.length];
    setAccompanimentInstrument(nextProfile.id);

    const btn = document.getElementById("btn-lagu-inst");
    const accBtn = document.getElementById("btn-lagu-accompany");
    if (btn) btn.innerHTML = `${nextProfile.icon} Suara: ${escapeHtml(nextProfile.label.replace(/^.*? /, ""))}`;
    if (accBtn && !isAccompanistActive()) {
      accBtn.innerHTML = `${nextProfile.icon} Iringi ${escapeHtml(nextProfile.label.split(" ")[1] || "Pujian")} AI`;
    }
    renderSongDetails();
  });

  // Tombol Suasana Drone Pad (Sunday Keys Style Continuous Atmosphere)
  document.getElementById("btn-lagu-drone-pad")?.addEventListener("click", () => {
    if (!currentSong) return;
    const baseKey = currentSong.key || "C";
    const transposedKey = transposeNote(baseKey, currentTranspose);
    const btn = document.getElementById("btn-lagu-drone-pad");

    const started = toggleContinuousWorshipPad(transposedKey);
    if (btn) {
      btn.classList.toggle("active", started);
      btn.innerHTML = started ? `✨ Pad Aktif (${transposedKey})` : "✨ Suasana Pad";
    }
  });

  // Tombol AI Pandu / Bisik Lirik
  document.getElementById("btn-lagu-prompter")?.addEventListener("click", () => {
    toggleLyricPrompter();
  });

  // Tombol Iringi Pujian AI (Worship Accompaniment)
  document.getElementById("btn-lagu-accompany")?.addEventListener("click", () => {
    if (!currentSong) return;
    const btn = document.getElementById("btn-lagu-accompany");
    const arrangement = getCurrentArrangement();
    const inst = getAccompanimentInstrument();
    const profile = INSTRUMENT_PROFILES.find((p) => p.id === inst) || INSTRUMENT_PROFILES[0];

    const started = toggleWorshipAccompanist(arrangement, (chordName, idx, total) => {
      if (btn) btn.innerHTML = `${profile.icon} Bar ${idx + 1}/${total}: <strong>${escapeHtml(chordName)}</strong>`;
      document.querySelectorAll(`[data-chord="${chordName}"]`).forEach((b) => {
        b.classList.add("strummed");
        setTimeout(() => b.classList.remove("strummed"), 400);
      });
    }, inst);

    if (btn) {
      btn.classList.toggle("active", started);
      if (!started) {
        btn.innerHTML = `${profile.icon} Iringi ${escapeHtml(profile.label.split(" ")[1] || "Pujian")} AI`;
      }
    }

    if (started && !isAutoScrolling) {
      toggleAutoScroll();
    }
  });

  document.getElementById("btn-lagu-pitch-pipe")?.addEventListener("click", () => {
    if (!currentSong) return;
    const baseKey = currentSong.key || "C";
    const transposedKey = transposeNote(baseKey, currentTranspose);
    playPitchPipe(transposedKey);
    const btn = document.getElementById("btn-lagu-pitch-pipe");
    if (btn) {
      btn.classList.add("playing");
      btn.innerHTML = `🔊 Nada ${transposedKey}`;
      setTimeout(() => {
        btn.classList.remove("playing");
        btn.innerHTML = `🎹 Nada Awal`;
      }, 2600);
    }
  });

  document.getElementById("btn-lagu-autoscroll")?.addEventListener("click", () => {
    toggleAutoScroll();
  });

  document.getElementById("btn-lagu-chord-mode")?.addEventListener("click", () => {
    isChordModeActive = !isChordModeActive;
    const btn = document.getElementById("btn-lagu-chord-mode");
    if (btn) {
      btn.classList.toggle("active", isChordModeActive);
      btn.innerHTML = isChordModeActive ? "🎸 Chord: AKTIF" : "🎸 Chord Lirik";
    }
    renderSongDetails();
  });

  document.getElementById("btn-lagu-metronome")?.addEventListener("click", () => {
    toggleMetronome();
  });

  let isGeminiLiveWorshipActive = false;

  // Tombol Pimpin Pujian Bersama Suara Asli Gemini Live AI
  document.getElementById("btn-lagu-voice")?.addEventListener("click", () => {
    if (!currentSong) return;
    const voiceBtn = document.getElementById("btn-lagu-voice");
    const accBtn = document.getElementById("btn-lagu-accompany");

    if (isGeminiLiveWorshipActive) {
      isGeminiLiveWorshipActive = false;
      if (transport.voice?.isActive?.()) transport.voice.stop?.();
      stopWorshipAccompanist();
      stopAutoScroll();
      if (voiceBtn) {
        voiceBtn.innerHTML = "🎙️ Pimpin Pujian Bersama Gemini AI";
        voiceBtn.classList.remove("active");
      }
      if (accBtn) {
        accBtn.classList.remove("active");
        const inst = getAccompanimentInstrument();
        const profile = INSTRUMENT_PROFILES.find((p) => p.id === inst) || INSTRUMENT_PROFILES[0];
        accBtn.innerHTML = `${profile.icon} Iringi ${escapeHtml(profile.label.split(" ")[1] || "Pujian")} AI`;
      }
      return;
    }

    // Aktifkan Suara Asli Gemini AI Live (Realtime WebSocket Neural Voice)
    isGeminiLiveWorshipActive = true;
    transport.voiceProfile = "alkitab-voice";

    const arrangement = getCurrentArrangement();
    const inst = getAccompanimentInstrument();
    const profile = INSTRUMENT_PROFILES.find((p) => p.id === inst) || INSTRUMENT_PROFILES[0];

    // 1. Jalankan Musik Iringan di Tempat — aransemen unik per lagu
    if (!isAccompanistActive()) {
      toggleWorshipAccompanist(arrangement, (chordName, idx, total) => {
        if (accBtn) accBtn.innerHTML = `${profile.icon} Bar ${idx + 1}/${total}: <strong>${escapeHtml(chordName)}</strong>`;
        document.querySelectorAll(`[data-chord="${chordName}"]`).forEach((b) => {
          b.classList.add("strummed");
          setTimeout(() => b.classList.remove("strummed"), 400);
        });
      }, inst);
      if (accBtn) accBtn.classList.add("active");
    }

    // 2. Jalankan Auto-Scroll Lirik
    if (!isAutoScrolling) {
      toggleAutoScroll();
    }

    // 3. Update Tombol
    if (voiceBtn) {
      voiceBtn.innerHTML = "⏹️ Hentikan Pimpinan Gemini AI";
      voiceBtn.classList.add("active");
    }

    // 4. Kirim instruksi ke Suara Gemini Live untuk memimpin pujian baris demi baris dengan nada & jeda
    window.__rhemaPrepareVoiceUserPrompt?.();
    transport.voice?.sendTextOrStart?.(
      `Shalom! Mari kita bersama memuji dan menyembah Tuhan dengan kidung "${currentSong.book} ${currentSong.no} — ${currentSong.title}" pada nada dasar ${arrangement.key}, tempo sekitar ${arrangement.bpm} BPM. Pimpinlah pujian ini dengan suara yang sangat hangat, teduh, penuh hadirat Roh Kudus. Ucapkan liriknya baris demi baris dengan tenang dan berikan jeda agar saudara dapat bernyanyi bersama: "${currentSong.lyrics.slice(0, 320)}". Jangan panggil pengguna "jemaat".`,
      { mic: false, preferClientContent: false },
    );
  });

  document.getElementById("btn-lagu-fav")?.addEventListener("click", () => {
    if (!currentSong) return;
    let favs = loadFavs();
    const idx = favs.findIndex((f) => f.id === currentSong.id);
    if (idx >= 0) favs.splice(idx, 1);
    else favs.unshift({ id: currentSong.id, title: `${currentSong.book} ${currentSong.no} — ${currentSong.title}` });
    saveFavs(favs);
    updateFavBtn();
  });

  document.addEventListener("rhema-open-lagu", (e) => {
    const id = /** @type {CustomEvent} */ (e).detail;
    document.dispatchEvent(new CustomEvent("rhema-nav", { detail: "lagu" }));
    showSong(String(id));
  });

  document.addEventListener("rhema-subview-back", (e) => {
    if (/** @type {CustomEvent} */ (e).detail === "lagu-detail") hideDetail();
  });

  return {
    refreshHome: () => renderHomeKidung(homeList),
    onScreen: () => {
      hideDetail();
      renderList(searchHymns(searchInput?.value || ""));
    },
  };
}

/** @param {import("../shared/chatCore.js").ChatTransport} [transport] */
export function openKidungHubModal(transport) {
  let modal = document.getElementById("kidung-hub-modal");
  if (modal) {
    hideDetail();
    modal.classList.add("active");
    renderList(getHymnsByBook("all"));
    return;
  }

  modal = document.createElement("div");
  modal.id = "kidung-hub-modal";
  modal.className = "apple-modal-overlay active";

  const bookPills = HYMN_BOOKS.map(
    (b, i) =>
      `<button type="button" class="book-pill ${i === 0 ? "active" : ""}" data-book="${b.id}">${b.icon} ${b.name.split(" ")[0]}</button>`,
  ).join("");

  modal.innerHTML = `
    <div class="apple-modal-sheet lectio-sheet kidung-hub-sheet">
      <div class="modal-handle-bar"></div>
      <div class="lectio-header">
        <div class="lectio-title-wrap">
          <span class="lectio-badge">Pujian &amp; Penyembahan</span>
          <h2 class="lectio-title">Kidung Jemaat</h2>
          <p class="lectio-ref-sub">KJ · PKJ · NKB · BE · Populer</p>
        </div>
        <button type="button" class="btn-modal-close" id="btn-close-kidung-hub" aria-label="Tutup">✕</button>
      </div>
      <div class="search-bar search-bar-premium">
        <input id="lagu-search" type="search" placeholder="Cari kidung… Mazmur Indah, KJ 478, pujian…" autocomplete="off" />
        <button id="btn-lagu-search" type="button" class="search-btn">Cari</button>
      </div>
      <div class="lagu-books-bar">${bookPills}</div>
      <div class="kidung-hub-body mobile-scroll">
        <div id="lagu-list"></div>
        <div id="lagu-detail" class="hidden">
          <button type="button" id="btn-lagu-back" class="btn-pill btn-soft">← Daftar Kidung</button>
          <p id="lagu-detail-badge" class="bento-kicker"></p>
          <h3 id="lagu-detail-title"></h3>
          <p id="lagu-detail-meta" class="mobile-note"></p>
          <div id="lagu-detail-chord" class="lagu-chord-block"></div>
          <pre id="lagu-detail-lyrics" class="lagu-lyrics-block"></pre>
          <div class="lagu-detail-toolbar">
            <button type="button" id="btn-lagu-voice" class="btn-pill primary">🎙️ Pimpin Pujian Bersama AI</button>
            <button type="button" id="btn-lagu-fav" class="btn-pill btn-soft">☆ Favorit</button>
            <button type="button" id="btn-lagu-transpose-down" class="btn-pill btn-soft">♭</button>
            <span id="lagu-transpose-val">Asli</span>
            <button type="button" id="btn-lagu-transpose-up" class="btn-pill btn-soft">♯</button>
            <button type="button" id="btn-lagu-transpose-reset" class="btn-pill btn-soft">Reset</button>
            <button type="button" id="btn-lagu-pitch-pipe" class="btn-pill btn-soft">🎹 Nada Awal</button>
            <button type="button" id="btn-lagu-autoscroll" class="btn-pill btn-soft">▶ Auto-Scroll</button>
            <button type="button" id="btn-lagu-inst" class="btn-pill btn-soft hidden" aria-hidden="true"></button>
            <button type="button" id="btn-lagu-accompany" class="btn-pill btn-soft hidden" aria-hidden="true"></button>
            <button type="button" id="btn-lagu-drone-pad" class="btn-pill btn-soft hidden" aria-hidden="true"></button>
            <button type="button" id="btn-lagu-prompter" class="btn-pill btn-soft hidden" aria-hidden="true"></button>
            <button type="button" id="btn-lagu-chord-mode" class="btn-pill btn-soft hidden" aria-hidden="true"></button>
            <button type="button" id="btn-lagu-metronome" class="btn-pill btn-soft hidden" aria-hidden="true"></button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector("#btn-close-kidung-hub")?.addEventListener("click", () => {
    hideDetail();
    stopAutoScroll();
    modal.classList.remove("active");
  });
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      hideDetail();
      stopAutoScroll();
      modal.classList.remove("active");
    }
  });
  modal.querySelector("#btn-lagu-back")?.addEventListener("click", () => hideDetail());

  if (transport) initLaguPanel(transport);
  else renderList(getHymnsByBook("all"));
}
