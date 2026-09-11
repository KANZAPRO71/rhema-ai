/**
 * Generator Gambar Kartu Ayat Alkitab Estetik (HD Shareable Verse Wallpaper Generator).
 */

import { isCapacitorNative } from "./nativeAudioPlayback.js";

export const SHARE_BACKGROUNDS = [
  { id: "none", label: "Gradasi Tema", emoji: "🎨", light: false },
  { id: "bright_sky", label: "Langit Cerah", emoji: "🌤", light: true },
  { id: "golden_morning", label: "Pagi Emas", emoji: "🌅", light: true },
  { id: "holy_white", label: "Putih Suci", emoji: "🤍", light: true },
  { id: "soft_blossom", label: "Mekar Lembut", emoji: "🌸", light: true },
  { id: "green_pastures", label: "Padang Hijau", emoji: "🌿", light: false },
  { id: "calm_sea", label: "Laut Tenang", emoji: "🌊", light: false },
  { id: "heavenly_rays", label: "Sinar Surga", emoji: "☀️", light: false },
  { id: "cross_dawn", label: "Fajar Salib", emoji: "✝️", light: false },
  { id: "holy_fire", label: "Api Kudus", emoji: "🔥", light: false },
  { id: "starry_night", label: "Malam Bintang", emoji: "🌙", light: false },
];

function isLightShareBackground(presetId) {
  return SHARE_BACKGROUNDS.some((bg) => bg.id === presetId && bg.light);
}

/** @param {typeof THEMES.gold} theme @param {string} bgPreset */
function resolveSharePalette(theme, bgPreset) {
  if (!isLightShareBackground(bgPreset)) return theme;
  return {
    ...theme,
    textColor: "#1c1917",
    subColor: "#57534e",
    quoteColor: "rgba(0, 0, 0, 0.07)",
    border: theme.border.replace(/[\d.]+\)$/, "0.55)"),
  };
}

/** @param {CanvasRenderingContext2D} ctx @param {number} w @param {number} h @param {string} presetId */
function drawShareBackground(ctx, w, h, presetId) {
  switch (presetId) {
    case "bright_sky": {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#7dd3fc");
      g.addColorStop(0.35, "#e0f2fe");
      g.addColorStop(0.7, "#fef9c3");
      g.addColorStop(1, "#fffbeb");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
      ctx.beginPath();
      ctx.ellipse(w * 0.22, h * 0.18, w * 0.16, h * 0.045, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(w * 0.68, h * 0.24, w * 0.2, h * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "golden_morning": {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#fff7ed");
      g.addColorStop(0.4, "#fef3c7");
      g.addColorStop(0.75, "#fde68a");
      g.addColorStop(1, "#fcd34d");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      const sun = ctx.createRadialGradient(w * 0.72, h * 0.14, 8, w * 0.72, h * 0.14, h * 0.35);
      sun.addColorStop(0, "rgba(255, 251, 235, 0.95)");
      sun.addColorStop(0.35, "rgba(253, 224, 71, 0.45)");
      sun.addColorStop(1, "transparent");
      ctx.fillStyle = sun;
      ctx.fillRect(0, 0, w, h);
      break;
    }
    case "holy_white": {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(0.45, "#fafaf9");
      g.addColorStop(1, "#f5f5f4");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
      ctx.beginPath();
      ctx.ellipse(w / 2, h * 0.42, w * 0.38, h * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "soft_blossom": {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#fdf2f8");
      g.addColorStop(0.45, "#fce7f3");
      g.addColorStop(0.8, "#fff1f2");
      g.addColorStop(1, "#ffe4e6");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 5; i++) {
        const x = w * (0.15 + i * 0.17);
        const y = h * (0.72 + (i % 2) * 0.04);
        ctx.fillStyle = `rgba(251, 207, 232, ${0.35 + (i % 3) * 0.12})`;
        ctx.beginPath();
        ctx.ellipse(x, y, w * 0.09, h * 0.025, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "green_pastures": {
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#7dd3fc");
      sky.addColorStop(0.35, "#bbf7d0");
      sky.addColorStop(1, "#15803d");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(21, 128, 61, 0.55)";
      ctx.beginPath();
      ctx.moveTo(0, h * 0.62);
      ctx.quadraticCurveTo(w * 0.25, h * 0.48, w * 0.5, h * 0.58);
      ctx.quadraticCurveTo(w * 0.78, h * 0.72, w, h * 0.52);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "calm_sea": {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#0c4a6e");
      g.addColorStop(0.4, "#0369a1");
      g.addColorStop(0.7, "#0284c7");
      g.addColorStop(1, "#0f766e");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 6; i++) {
        ctx.strokeStyle = `rgba(255,255,255,${0.06 + i * 0.02})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        const y = h * (0.55 + i * 0.07);
        ctx.moveTo(0, y);
        ctx.quadraticCurveTo(w * 0.5, y + 18, w, y);
        ctx.stroke();
      }
      break;
    }
    case "heavenly_rays": {
      ctx.fillStyle = "#1e3a5f";
      ctx.fillRect(0, 0, w, h);
      const rays = ctx.createRadialGradient(w / 2, h * 0.15, 10, w / 2, h * 0.15, h * 0.85);
      rays.addColorStop(0, "rgba(255, 236, 179, 0.95)");
      rays.addColorStop(0.25, "rgba(251, 191, 36, 0.45)");
      rays.addColorStop(1, "transparent");
      ctx.fillStyle = rays;
      ctx.fillRect(0, 0, w, h);
      break;
    }
    case "cross_dawn": {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#1e1b4b");
      g.addColorStop(0.35, "#7c2d12");
      g.addColorStop(0.55, "#fb923c");
      g.addColorStop(0.75, "#fde68a");
      g.addColorStop(1, "#fef3c7");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(0, h * 0.55, w, h * 0.45);
      break;
    }
    case "holy_fire": {
      ctx.fillStyle = "#1c1917";
      ctx.fillRect(0, 0, w, h);
      const fire = ctx.createRadialGradient(w / 2, h * 0.72, 20, w / 2, h * 0.72, h * 0.45);
      fire.addColorStop(0, "rgba(251, 146, 60, 0.9)");
      fire.addColorStop(0.4, "rgba(234, 88, 12, 0.45)");
      fire.addColorStop(1, "transparent");
      ctx.fillStyle = fire;
      ctx.fillRect(0, 0, w, h);
      break;
    }
    case "starry_night": {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#020617");
      g.addColorStop(0.5, "#1e1b4b");
      g.addColorStop(1, "#312e81");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 80; i++) {
        const x = (Math.sin(i * 47) * 0.5 + 0.5) * w;
        const y = (Math.cos(i * 31) * 0.5 + 0.5) * h * 0.75;
        ctx.fillStyle = `rgba(255,255,255,${0.25 + (i % 5) * 0.12})`;
        ctx.beginPath();
        ctx.arc(x, y, 1 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    default:
      break;
  }
}

function drawContrastOverlay(ctx, w, h, contrastLevel = 50, light = false) {
  const t = Math.max(0, Math.min(100, contrastLevel)) / 100;

  if (light) {
    if (t < 0.08) return;
    const scrim = ctx.createLinearGradient(0, 0, 0, h);
    scrim.addColorStop(0, `rgba(255, 255, 255, ${0.28 - t * 0.2})`);
    scrim.addColorStop(0.5, `rgba(0, 0, 0, ${t * 0.06})`);
    scrim.addColorStop(1, `rgba(0, 0, 0, ${t * 0.14})`);
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, w, h);
    return;
  }
  const scrim = ctx.createLinearGradient(0, 0, 0, h);
  scrim.addColorStop(0, `rgba(0, 0, 0, ${0.04 + t * 0.28})`);
  scrim.addColorStop(0.45, `rgba(0, 0, 0, ${0.12 + t * 0.38})`);
  scrim.addColorStop(1, `rgba(0, 0, 0, ${0.2 + t * 0.48})`);
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, w, h);

  if (t > 0.55) {
    const vignette = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.72);
    vignette.addColorStop(0, "transparent");
    vignette.addColorStop(1, `rgba(0, 0, 0, ${(t - 0.55) * 0.55})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  }
}

export const THEMES = {
  gold: {
    name: "Luxury Gold",
    bgStart: "#1a160d",
    bgEnd: "#080705",
    accent: "#ffd700",
    textColor: "#fefcf6",
    subColor: "#d4af37",
    quoteColor: "rgba(255, 215, 0, 0.22)",
    border: "rgba(255, 215, 0, 0.45)",
    glowColor: "rgba(255, 215, 0, 0.15)",
  },
  navy: {
    name: "Deep Ocean",
    bgStart: "#0a192f",
    bgEnd: "#020c1b",
    accent: "#38bdf8",
    textColor: "#f0f9ff",
    subColor: "#7dd3fc",
    quoteColor: "rgba(56, 189, 248, 0.2)",
    border: "rgba(56, 189, 248, 0.4)",
    glowColor: "rgba(56, 189, 248, 0.18)",
  },
  sunset: {
    name: "Warm Dawn",
    bgStart: "#3b1124",
    bgEnd: "#15050c",
    accent: "#fb923c",
    textColor: "#fff7ed",
    subColor: "#fdba74",
    quoteColor: "rgba(251, 146, 60, 0.22)",
    border: "rgba(251, 146, 60, 0.4)",
    glowColor: "rgba(251, 146, 60, 0.16)",
  },
  emerald: {
    name: "Living Emerald",
    bgStart: "#06281e",
    bgEnd: "#02110c",
    accent: "#34d399",
    textColor: "#ecfdf5",
    subColor: "#6ee7b7",
    quoteColor: "rgba(52, 211, 153, 0.2)",
    border: "rgba(52, 211, 153, 0.4)",
    glowColor: "rgba(52, 211, 153, 0.15)",
  },
  purple: {
    name: "Royal Grace",
    bgStart: "#2e1065",
    bgEnd: "#0f0524",
    accent: "#c084fc",
    textColor: "#faf5ff",
    subColor: "#e9d5ff",
    quoteColor: "rgba(192, 132, 252, 0.22)",
    border: "rgba(192, 132, 252, 0.45)",
    glowColor: "rgba(192, 132, 252, 0.18)",
  },
};

export const RATIOS = {
  story: { name: "9:16 Story / Status", width: 1080, height: 1920 },
  portrait: { name: "4:5 Portrait Feed", width: 1080, height: 1350 },
  square: { name: "1:1 Square Feed", width: 1080, height: 1080 },
};

function verseShareFilename(reference, ratio) {
  const base = (reference || "Ayat").replace(/[^\w\s-]/gi, "").replace(/\s+/g, "_").slice(0, 60);
  return `Rhema_${base}_${ratio}.png`;
}

/** @returns {Promise<Blob>} */
function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    if (!canvas) {
      reject(new Error("Canvas preview belum siap."));
      return;
    }
    if (typeof canvas.toBlob === "function") {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Gagal mengekspor gambar dari canvas."));
        },
        "image/png",
        0.95,
      );
      return;
    }
    try {
      const dataUrl = canvas.toDataURL("image/png");
      fetch(dataUrl)
        .then((r) => r.blob())
        .then(resolve)
        .catch(reject);
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

/** @param {Blob} blob @param {string} filename */
async function downloadBlobFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  window.setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 1000);
}

/** @param {Blob} blob @param {string} filename @param {string} alt @returns {"shared" | "lightbox" | "cancelled"} */
async function shareOrSaveVerseImage(blob, filename, alt) {
  if (typeof navigator.share === "function") {
    try {
      const file = new File([blob], filename, { type: "image/png" });
      const payload = { files: [file], title: alt || "Kartu ayat Rhema" };
      if (typeof navigator.canShare !== "function" || navigator.canShare(payload)) {
        await navigator.share(payload);
        return "shared";
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return "cancelled";
    }
  }

  showVerseImageLightbox(blob, alt || "Kartu ayat");
  return "lightbox";
}

/** @param {Blob} blob @param {string} [alt] @returns {boolean} */
function showVerseImageLightbox(blob, alt = "Kartu ayat") {
  const url = URL.createObjectURL(blob);

  document.getElementById("verse-share-lightbox")?.remove();

  const overlay = document.createElement("div");
  overlay.id = "verse-share-lightbox";
  overlay.className = "verse-share-lightbox active";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Pratinjau gambar ayat");

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "verse-lightbox-close btn-modal-close";
  closeBtn.id = "btn-close-verse-lightbox";
  closeBtn.setAttribute("aria-label", "Tutup");
  closeBtn.textContent = "✕";

  const body = document.createElement("div");
  body.className = "verse-lightbox-body";

  const img = document.createElement("img");
  img.className = "verse-lightbox-img";
  img.src = url;
  img.alt = alt;

  const hint = document.createElement("p");
  hint.className = "verse-lightbox-hint";
  hint.textContent = "Tekan lama gambar → Simpan ke Galeri HP";

  body.append(img, hint);
  overlay.append(closeBtn, body);

  const close = () => {
    document.removeEventListener("keydown", onKey);
    overlay.remove();
    URL.revokeObjectURL(url);
  };

  const onKey = (e) => {
    if (e.key === "Escape") close();
  };

  closeBtn.onclick = close;
  overlay.onclick = (e) => {
    if (e.target === overlay) close();
  };
  document.addEventListener("keydown", onKey);
  document.body.appendChild(overlay);
  closeBtn.focus();
  return true;
}

/** @param {HTMLElement | null} el @param {string} text @param {number} [autoHideMs] */
function showShareStatus(el, text, autoHideMs = 5000) {
  if (!el) return;
  el.textContent = text;
  el.classList.remove("hidden");
  if (autoHideMs > 0) {
    window.clearTimeout(el._hideTimer);
    el._hideTimer = window.setTimeout(() => el.classList.add("hidden"), autoHideMs);
  }
}

function isPreviewBrowser() {
  if (document.documentElement.classList.contains("rhema-android-parity")) return false;
  return document.documentElement.classList.contains("rhema-preview");
}

/** @param {HTMLCanvasElement} canvas @param {object} verse @param {string} ratio @param {HTMLElement | null} statusEl */
async function downloadVerseImage(canvas, verse, ratio, statusEl) {
  const filename = verseShareFilename(verse.reference, ratio);
  const alt = verse.reference || "Kartu ayat";
  try {
    const blob = await canvasToPngBlob(canvas);

    // Preview IDE (Cursor Simple Browser) sering memblokir unduh otomatis.
    if (isPreviewBrowser()) {
      showVerseImageLightbox(blob, alt);
      showShareStatus(
        statusEl,
        "ℹ️ Gambar ditampilkan di layar — tekan ✕ untuk tutup, tekan lama gambar untuk simpan.",
        0,
      );
      return;
    }

    // WebView Android/Capacitor tidak mendukung <a download> — pakai share sheet atau lightbox.
    if (isCapacitorNative()) {
      const result = await shareOrSaveVerseImage(blob, filename, alt);
      if (result === "shared") {
        showShareStatus(
          statusEl,
          "✅ Pilih Simpan gambar / Galeri di menu bagikan untuk menyimpan ke HP.",
          8000,
        );
      } else if (result === "cancelled") {
        showShareStatus(statusEl, "ℹ️ Dibatalkan.", 4000);
      } else {
        showShareStatus(statusEl, "ℹ️ Tekan lama gambar → Simpan ke Galeri HP.", 0);
      }
      return;
    }

    await downloadBlobFile(blob, filename);
    showShareStatus(statusEl, "✅ Gambar HD disimpan — unggah ke WA, Facebook, atau Instagram dari Galeri HP.");
  } catch (err) {
    try {
      const blob = await canvasToPngBlob(canvas);
      showVerseImageLightbox(blob, verse.reference || "Kartu ayat");
      showShareStatus(statusEl, "ℹ️ Unduh otomatis diblokir — tekan lama gambar untuk simpan.", 8000);
      return;
    } catch {
      /* fall through */
    }
    showShareStatus(statusEl, `⚠️ ${err instanceof Error ? err.message : "Gagal mengunduh gambar."}`, 0);
  }
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let currentLine = words[0] || "";

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + " " + word).width;
    if (width < maxWidth) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Render kartu ayat ke elemen Canvas
 * @param {HTMLCanvasElement} canvas
 * @param {object} verse
 * @param {string} themeKey
 * @param {string} ratioKey
 * @param {string} [bgPreset]
 * @param {number} [contrastLevel] 0–100, default 50
 */
export function renderVerseToCanvas(
  canvas,
  verse,
  themeKey = "gold",
  ratioKey = "story",
  bgPreset = "none",
  contrastLevel = 50,
) {
  const theme = THEMES[themeKey] || THEMES.gold;
  const palette = resolveSharePalette(theme, bgPreset);
  const ratio = RATIOS[ratioKey] || RATIOS.story;
  const width = ratio.width;
  const height = ratio.height;
  const contrast = Math.max(0, Math.min(100, Number(contrastLevel) || 50));
  const contrastT = contrast / 100;
  const lightBg = isLightShareBackground(bgPreset);

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const useManualBg = bgPreset && bgPreset !== "none";

  if (useManualBg) {
    drawShareBackground(ctx, width, height, bgPreset);
  } else {
    const grad = ctx.createRadialGradient(width / 2, height * 0.35, 120, width / 2, height / 2, height * 0.75);
    grad.addColorStop(0, theme.bgStart);
    grad.addColorStop(1, theme.bgEnd);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    const glowGrad = ctx.createRadialGradient(width / 2, height * 0.45, 20, width / 2, height * 0.45, width * 0.45);
    glowGrad.addColorStop(0, theme.glowColor);
    glowGrad.addColorStop(1, "transparent");
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, width, height);
  }

  drawContrastOverlay(ctx, width, height, contrast, lightBg);

  // 3. Bingkai Emas Ganda
  const margin = ratioKey === "story" ? 70 : 50;
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 4;
  ctx.strokeRect(margin, margin, width - margin * 2, height - margin * 2);

  ctx.strokeStyle = lightBg ? "rgba(0, 0, 0, 0.06)" : "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;
  ctx.strokeRect(margin + 16, margin + 16, width - (margin + 16) * 2, height - (margin + 16) * 2);

  // 4. Header Salib & Label
  const headerY = ratioKey === "story" ? 220 : 160;
  ctx.fillStyle = palette.accent;
  ctx.textAlign = "center";
  ctx.font = "bold 44px serif";
  ctx.fillText("✝", width / 2, headerY);

  ctx.font = "700 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = palette.subColor;
  ctx.letterSpacing = "6px";
  ctx.fillText("FIRMAN TUHAN HARI INI", width / 2, headerY + 54);

  // 5. Watermark Tanda Kutip
  ctx.font = "bold 280px Georgia, serif";
  ctx.fillStyle = palette.quoteColor;
  ctx.fillText("“", width / 2, headerY + 280);

  // 6. Teks Ayat
  const text = verse.text || "";
  const maxTextWidth = width - (margin * 2 + 140);

  let fontSize = ratioKey === "story" ? 48 : 42;
  if (text.length > 220) fontSize = ratioKey === "story" ? 38 : 32;
  else if (text.length > 140) fontSize = ratioKey === "story" ? 44 : 38;
  else if (text.length < 60) fontSize = ratioKey === "story" ? 56 : 48;

  ctx.font = `italic 600 ${fontSize}px Georgia, 'Times New Roman', serif`;
  ctx.fillStyle = palette.textColor;
  ctx.textAlign = "center";

  // Drop shadow — gelap di latar terang, terang di latar gelap
  if (lightBg) {
    ctx.shadowColor = `rgba(0, 0, 0, ${0.06 + contrastT * 0.28})`;
    ctx.shadowBlur = 4 + contrastT * 14;
  } else {
    ctx.shadowColor = `rgba(0, 0, 0, ${0.45 + contrastT * 0.5})`;
    ctx.shadowBlur = 8 + contrastT * 22;
  }
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 3 + contrastT * 5;

  const lineHeight = fontSize * 1.55;
  const lines = wrapText(ctx, `“${text}”`, maxTextWidth);

  const totalTextHeight = lines.length * lineHeight;
  const centerY = ratioKey === "story" ? height * 0.48 : height * 0.45;
  let startY = centerY - totalTextHeight / 2;

  lines.forEach((line) => {
    ctx.fillText(line, width / 2, startY);
    startY += lineHeight;
  });

  // Reset shadow untuk elemen garis & watermark
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // 7. Garis Pemisah Aksen
  const sepY = Math.max(startY + 40, ratioKey === "story" ? height * 0.72 : height * 0.68);
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 100, sepY);
  ctx.lineTo(width / 2 + 100, sepY);
  ctx.stroke();

  // 8. Referensi Ayat
  ctx.font = "bold 40px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillStyle = palette.accent;
  ctx.letterSpacing = "2px";
  ctx.fillText(verse.reference || "Alkitab TB", width / 2, sepY + 65);

  ctx.font = "24px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = palette.subColor;
  ctx.letterSpacing = "1px";
  ctx.fillText("Terjemahan Baru · Lembaga Alkitab Indonesia (LAI)", width / 2, sepY + 115);

  // 9. Footer Watermark
  ctx.font = "700 20px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = lightBg ? "rgba(0, 0, 0, 0.28)" : "rgba(255, 255, 255, 0.4)";
  ctx.letterSpacing = "4px";
  ctx.fillText("RHEMA ALKITAB AI VOICE", width / 2, height - (margin + 30));
}

/**
 * Tampilkan Modal Berbagi Gambar Ayat Estetik
 */
const SHARE_MODAL_UI_VERSION = "v10";

export function openVerseShareModal(verse) {
  if (!verse?.text) return false;

  let modal = document.getElementById("modal-share-verse");
  // Ganti modal HTML lama (mobile-modal / versi UI usang) agar tidak bentrok.
  if (
    modal &&
    (!modal.classList.contains("apple-modal-overlay") ||
      modal.dataset.shareUi !== SHARE_MODAL_UI_VERSION ||
      !modal.querySelector(".share-theme-pills") ||
      !modal.querySelector(".share-bg-picker") ||
      !modal.querySelector("#share-contrast-slider"))
  ) {
    modal.remove();
    modal = null;
  }

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modal-share-verse";
    modal.dataset.shareUi = SHARE_MODAL_UI_VERSION;
    modal.className = "apple-modal-overlay active";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "Rhema Studio");
    modal.innerHTML = `
      <div class="apple-modal-sheet share-sheet">
        <div class="share-sheet-scroll">
          <div class="modal-handle-bar"></div>
          <div class="share-modal-head">
            <div>
              <span class="share-badge">🎨 Rhema Studio</span>
              <h3 class="share-modal-title">Kartu Ayat Estetik HD</h3>
            </div>
            <button type="button" class="btn-modal-close" id="btn-close-share-modal">✕</button>
          </div>

          <div class="canvas-preview-wrap">
            <canvas id="verse-share-canvas"></canvas>
          </div>

          <div class="share-tools-group share-theme-group">
            <label class="share-tool-label">Tema Warna:</label>
            <div class="share-theme-pills">
              <button type="button" class="theme-pick active" data-theme="gold">✨ Gold</button>
              <button type="button" class="theme-pick" data-theme="navy">🌊 Navy</button>
              <button type="button" class="theme-pick" data-theme="sunset">🌅 Sunset</button>
              <button type="button" class="theme-pick" data-theme="emerald">🌿 Emerald</button>
              <button type="button" class="theme-pick" data-theme="purple">👑 Purple</button>
            </div>
          </div>

          <div class="share-tools-group share-bg-group">
            <label class="share-tool-label">Latar Belakang:</label>
            <div class="share-bg-picker" id="share-bg-picker">
              ${SHARE_BACKGROUNDS.map(
                (bg, i) =>
                  `<button type="button" class="bg-pick ${i === 0 ? "active" : ""}${bg.light ? " bg-pick-light" : ""}" data-bg="${bg.id}"${bg.light ? ' data-light="true"' : ""} title="${bg.label}">
                    <span class="bg-pick-emoji">${bg.emoji}</span>
                    <span class="bg-pick-label">${bg.label}</span>
                  </button>`,
              ).join("")}
            </div>
          </div>

          <div class="share-tools-group share-contrast-group">
            <div class="share-contrast-head">
              <label class="share-tool-label" for="share-contrast-slider">Kontras teks &amp; latar</label>
              <span class="share-contrast-value" id="share-contrast-value">50%</span>
            </div>
            <input type="range" id="share-contrast-slider" class="share-contrast-slider"
              min="0" max="100" value="50" step="1" aria-label="Atur kontras kartu ayat" />
            <div class="share-contrast-labels">
              <span>Terang</span>
              <span>Gelap / tajam</span>
            </div>
          </div>

          <div class="share-tools-group">
            <label class="share-tool-label">Ukuran Layar:</label>
            <div class="share-ratios-bar">
              <button type="button" class="ratio-pill active" data-ratio="story">📱 Story (9:16)</button>
              <button type="button" class="ratio-pill" data-ratio="portrait">🖼 Portrait (4:5)</button>
              <button type="button" class="ratio-pill" data-ratio="square">⏹ Square (1:1)</button>
            </div>
          </div>
        </div>

        <div class="share-sheet-footer">
          <div class="share-modal-actions">
            <button type="button" class="btn-pill primary glow full" id="btn-download-verse-img">💾 Unduh ke Galeri HP</button>
          </div>
          <button type="button" class="btn-pill btn-soft full share-preview-img-btn hidden" id="btn-preview-verse-img">
            🖼 Lihat Gambar (simpan manual)
          </button>
          <p class="share-action-status hidden" id="share-action-status" aria-live="polite"></p>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  modal.classList.remove("hidden");
  modal.classList.add("active");
  modal.style.zIndex = "10001";
  document.body.style.overflow = "hidden";

  let actionStatus = modal.querySelector("#share-action-status");
  if (!actionStatus) {
    const actions = modal.querySelector(".share-modal-actions");
    if (actions) {
      actionStatus = document.createElement("p");
      actionStatus.id = "share-action-status";
      actionStatus.className = "share-action-status hidden";
      actionStatus.setAttribute("aria-live", "polite");
      actions.insertAdjacentElement("afterend", actionStatus);
    }
  }

  const canvas = modal.querySelector("#verse-share-canvas");
  if (!canvas) return false;

  let currentTheme = "gold";
  let currentRatio = "story";
  let currentBgPreset = "none";
  let currentContrast = 50;

  const redraw = () => {
    try {
      renderVerseToCanvas(canvas, verse, currentTheme, currentRatio, currentBgPreset, currentContrast);
    } catch (err) {
      console.error("[rhema] verse share canvas error:", err);
    }
  };

  redraw();

  const contrastSlider = modal.querySelector("#share-contrast-slider");
  const contrastValue = modal.querySelector("#share-contrast-value");
  if (contrastSlider) {
    contrastSlider.oninput = () => {
      currentContrast = Number(contrastSlider.value) || 50;
      if (contrastValue) contrastValue.textContent = `${currentContrast}%`;
      redraw();
    };
  }

  const closeModal = () => {
    modal.classList.add("hidden");
    modal.classList.remove("active");
    document.body.style.overflow = "";
  };

  const closeBtn = modal.querySelector("#btn-close-share-modal");
  if (closeBtn) closeBtn.onclick = closeModal;
  modal.onclick = (e) => {
    if (e.target === modal) closeModal();
  };

  const previewBtn = modal.querySelector("#btn-preview-verse-img");
  if (previewBtn) {
    if (isPreviewBrowser() || isCapacitorNative()) previewBtn.classList.remove("hidden");
    previewBtn.onclick = async () => {
      previewBtn.disabled = true;
      showShareStatus(actionStatus, "⏳ Menampilkan gambar…", 0);
      try {
        const blob = await canvasToPngBlob(canvas);
        showVerseImageLightbox(blob, verse.reference || "Kartu ayat");
        showShareStatus(actionStatus, "ℹ️ Tekan ✕ untuk tutup — tekan lama gambar untuk simpan ke Galeri.", 0);
      } catch (err) {
        showShareStatus(actionStatus, `⚠️ ${err instanceof Error ? err.message : "Gagal menampilkan gambar."}`, 0);
      } finally {
        previewBtn.disabled = false;
      }
    };
  }

  modal.querySelectorAll(".bg-pick").forEach((btn) => {
    btn.onclick = () => {
      modal.querySelectorAll(".bg-pick").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentBgPreset = btn.getAttribute("data-bg") || "none";
      redraw();
    };
  });

  modal.querySelectorAll(".ratio-pill").forEach((btn) => {
    btn.onclick = () => {
      modal.querySelectorAll(".ratio-pill").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentRatio = btn.getAttribute("data-ratio") || "story";
      redraw();
    };
  });

  modal.querySelectorAll(".theme-pick, .theme-swatch").forEach((btn) => {
    btn.onclick = () => {
      modal.querySelectorAll(".theme-pick, .theme-swatch").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentTheme = btn.getAttribute("data-theme") || "gold";
      redraw();
    };
  });

  const downloadBtn = modal.querySelector("#btn-download-verse-img");
  if (downloadBtn) {
    downloadBtn.onclick = async () => {
      downloadBtn.disabled = true;
      showShareStatus(actionStatus, "⏳ Menyiapkan gambar HD…", 0);
      try {
        await downloadVerseImage(canvas, verse, currentRatio, actionStatus);
      } finally {
        downloadBtn.disabled = false;
      }
    };
  }

  return true;
}
