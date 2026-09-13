/**
 * Kuis Alkitab harian — carousel interaktif di Beranda / tab Program.
 */
import {
  getDailyQuizQuestions,
  getDailyQuizTopic,
  isDailyQuizComplete,
  loadQuizState,
  saveQuizAnswer,
  scoreDailyQuiz,
} from "./dailyQuizEngine.js";
import { isGlobalUiLang } from "./localeProfile.js";
import { escapeAttr, escapeHtml } from "./markdown.js";
import { isNativeQuizStoreAvailable, saveDailyQuizNative } from "./quizNativeStore.js";
import { awardDailyQuizXp } from "./quizProfileStore.js";
import { t } from "./uiStrings.js";

/** @type {{ askVoice?: (text: string) => void, go?: (screen: string) => void, markTodayRead?: () => void, renderHomeStreakMini?: () => void } | null} */
let quizBridge = null;

/** @type {number | null} */
let quizViewIndex = null;

/** @type {Set<string>} */
const quizHintOpen = new Set();

/** @param {{ askVoice?: (text: string) => void, go?: (screen: string) => void, markTodayRead?: () => void, renderHomeStreakMini?: () => void }} bridge */
export function configureDailyQuizPanel(bridge) {
  quizBridge = bridge;
}

export function openHomeQuizSection() {
  /* Kuis sudah terbuka di Beranda — jangan auto-scroll saat loadHome. */
}

export function closeHomeQuizSection() {
  quizViewIndex = null;
}

/** @param {Array<{ id: string }>} dailyQuestions @param {Record<string, number>} answers */
function resolveQuizViewIndex(dailyQuestions, answers) {
  const firstOpenIdx = dailyQuestions.findIndex((q) => typeof answers[q.id] !== "number");
  if (quizViewIndex == null || quizViewIndex < 0 || quizViewIndex >= dailyQuestions.length) {
    return firstOpenIdx >= 0 ? firstOpenIdx : Math.max(0, dailyQuestions.length - 1);
  }
  return quizViewIndex;
}

/** @param {HTMLElement | null} scoreBadge @param {number} correctCount @param {number} total @param {number} totalAnswered */
function updateQuizScoreBadge(scoreBadge, correctCount, total, totalAnswered) {
  if (!scoreBadge) return;
  if (totalAnswered > 0) {
    scoreBadge.classList.remove("hidden");
    scoreBadge.innerHTML = `Skor Harian: <strong>${correctCount} / ${total} Benar</strong> (${Math.round((correctCount / total) * 100)}%)`;
  } else {
    scoreBadge.classList.add("hidden");
  }
}

/** @param {HTMLElement} container */
function bindQuizSlideAnimation(container) {
  const quizCard = container.querySelector(".quiz-slide-in");
  quizCard?.addEventListener("animationend", () => quizCard.classList.remove("quiz-slide-in"), { once: true });
}

/** @param {string} dateKey @param {number} total @param {number} correctCount @param {number} xpEarned */
async function persistDailyQuizCompletion(dateKey, total, correctCount, xpEarned) {
  const nativeSaved = await saveDailyQuizNative({
    dateKey,
    totalQuestions: total,
    correctAnswers: correctCount,
    xpEarned,
    isCompleted: true,
  });
  if (!nativeSaved && !isNativeQuizStoreAvailable()) {
    quizBridge?.markTodayRead?.();
  } else {
    quizBridge?.renderHomeStreakMini?.();
  }
}

export function renderDailyBibleQuiz() {
  const container = document.getElementById("daily-quiz-container");
  const scoreBadge = document.getElementById("quiz-score-badge");
  const chipScore = document.getElementById("home-quiz-chip-score");
  if (!container) return;

  const dailyQuestions = getDailyQuizQuestions();
  const { dateKey, answers: quizUserAnswers } = loadQuizState();
  const dailyTopic = getDailyQuizTopic(dateKey);
  const topicChip = document.getElementById("home-quiz-topic-chip");
  if (topicChip) topicChip.textContent = dailyTopic.label;

  if (container.dataset.quizDate !== dateKey) {
    container.dataset.quizDate = dateKey;
    quizViewIndex = null;
    quizHintOpen.clear();
    container.dataset.quizFinish = "0";
  }

  const { correct: correctCount, answered: totalAnswered, total } = scoreDailyQuiz(dailyQuestions, quizUserAnswers);
  const allComplete = isDailyQuizComplete(dailyQuestions, quizUserAnswers);
  const showIdx = resolveQuizViewIndex(dailyQuestions, quizUserAnswers);
  quizViewIndex = showIdx;

  if (chipScore) {
    if (allComplete && container.dataset.quizFinish === "1") {
      chipScore.textContent = t("quiz.done", { correct: String(correctCount), total: String(total) });
    } else if (totalAnswered > 0) {
      chipScore.textContent = `${showIdx + 1} / ${total}`;
    } else {
      chipScore.textContent = t("home.quiz.notStarted");
    }
  }

  if (allComplete && container.dataset.quizFinish === "1") {
    const { xpEarned, profile } = awardDailyQuizXp(correctCount, total, dateKey, dailyTopic.key);
    void persistDailyQuizCompletion(dateKey, total, correctCount, xpEarned);

    container.innerHTML = `
      <div class="quiz-finish-card glass-card quiz-slide-in">
        <span class="quiz-finish-icon" aria-hidden="true">${correctCount === total ? "🏆" : "✨"}</span>
        <h4 class="quiz-finish-title">${escapeHtml(t("quiz.finish.title"))}</h4>
        <p class="quiz-finish-sub">${escapeHtml(t("quiz.finish.sub", { correct: String(correctCount), total: String(total) }))}</p>
        ${xpEarned > 0 ? `<p class="quiz-xp-earned">+${xpEarned} XP · Level <strong>${escapeHtml(profile.levelTitle)}</strong></p>` : `<p class="quiz-xp-earned">Level <strong>${escapeHtml(profile.levelTitle)}</strong> · ${profile.xp} XP</p>`}
        <button type="button" class="quiz-btn-secondary" id="quiz-review-btn">${escapeHtml(t("quiz.review"))}</button>
      </div>
    `;
    container.querySelector("#quiz-review-btn")?.addEventListener("click", () => {
      container.dataset.quizFinish = "0";
      quizViewIndex = 0;
      renderDailyBibleQuiz();
    });
    bindQuizSlideAnimation(container);
    updateQuizScoreBadge(scoreBadge, correctCount, total, totalAnswered);
    return;
  }

  container.dataset.quizFinish = "0";
  const q = dailyQuestions[showIdx];
  const userChoice = quizUserAnswers[q.id];
  const isAnswered = typeof userChoice === "number";
  const hintVisible = quizHintOpen.has(q.id);
  const hintText = q.hint || q.explanation;

  const optionsHtml = q.options
    .map((opt, optIdx) => {
      let btnClass = "quiz-opt-btn";
      if (isAnswered) {
        if (optIdx === q.correctIndex) btnClass += " correct";
        else if (optIdx === userChoice) btnClass += " wrong";
      }
      return `
      <button type="button" class="${btnClass}" data-qid="${escapeAttr(q.id)}" data-opt="${optIdx}" ${isAnswered ? "disabled" : ""}>
        <span class="opt-index">${String.fromCharCode(65 + optIdx)}</span>
        <span class="opt-text">${escapeHtml(opt)}</span>
      </button>
    `;
    })
    .join("");

  const dotsHtml = dailyQuestions
    .map((item, idx) => {
      const answered = typeof quizUserAnswers[item.id] === "number";
      let cls = "quiz-carousel-dot";
      if (idx === showIdx) cls += " is-active";
      else if (answered) cls += " is-done";
      return `<button type="button" class="${cls}" data-quiz-idx="${idx}" aria-label="${escapeHtml(t("quiz.progressAria", { n: String(idx + 1) }))}"></button>`;
    })
    .join("");

  const canGoNext = isAnswered && showIdx < dailyQuestions.length - 1;
  const isLastAnswered = isAnswered && showIdx === dailyQuestions.length - 1;

  container.innerHTML = `
    <article class="quiz-interactive-card glass-card quiz-slide-in">
      <header class="quiz-interactive-head">
        <span class="quiz-progress-fraction" aria-live="polite">${showIdx + 1} / ${dailyQuestions.length}</span>
        <span class="quiz-ref-badge">${escapeHtml(q.verseRef)}</span>
      </header>
      ${q.visualEmoji ? `
        <div class="quiz-visual-banner" aria-hidden="true">
          <span class="quiz-visual-emoji">${q.visualEmoji}</span>
          <span class="quiz-visual-label">${escapeHtml(q.visualLabel || dailyTopic.label)}</span>
        </div>
      ` : ""}
      <h4 class="quiz-qtext">${escapeHtml(q.question)}</h4>
      <div class="quiz-options-list">${optionsHtml}</div>
      ${hintVisible ? `
        <div class="quiz-hint-panel" role="note">
          <span class="quiz-hint-label">${escapeHtml(t("quiz.hint.label"))}</span>
          <p class="quiz-hint-text">${escapeHtml(hintText)}</p>
        </div>
      ` : ""}
      ${isAnswered ? `
        <div class="quiz-explanation ${userChoice === q.correctIndex ? "success" : "review"}">
          <span class="exp-icon">${userChoice === q.correctIndex ? escapeHtml(t("quiz.correct")) : escapeHtml(t("quiz.explainLabel"))}</span>
          <p class="exp-text">${escapeHtml(q.explanation)}</p>
        </div>
        ${userChoice !== q.correctIndex ? `
          <button type="button" class="quiz-btn-voice" id="quiz-ask-voice-btn">${escapeHtml(t("quiz.askVoice"))}</button>
        ` : ""}
      ` : ""}
      <footer class="quiz-interactive-foot">
        <button type="button" class="quiz-btn-ghost" id="quiz-hint-btn" ${isAnswered ? "disabled" : ""}>
          ${hintVisible ? escapeHtml(t("quiz.hint.hide")) : escapeHtml(t("quiz.hint.show"))}
        </button>
        <button type="button" class="quiz-btn-next" id="quiz-next-btn" ${canGoNext || (isLastAnswered && allComplete) ? "" : "disabled"}>
          ${isLastAnswered ? (allComplete ? escapeHtml(t("quiz.seeScore")) : escapeHtml(t("quiz.next"))) : escapeHtml(t("quiz.next"))}
        </button>
      </footer>
    </article>
    <div class="quiz-carousel-dots" role="tablist" aria-label="${escapeHtml(t("quiz.progressList"))}">${dotsHtml}</div>
  `;

  updateQuizScoreBadge(scoreBadge, correctCount, total, totalAnswered);
  bindQuizSlideAnimation(container);

  container.querySelector("#quiz-ask-voice-btn")?.addEventListener("click", () => {
    const prompt = isGlobalUiLang()
      ? `Explain the theological and historical Bible context for this quiz question: "${q.question}" Reference: ${q.verseRef}. Correct answer: ${q.options[q.correctIndex]}.`
      : `Jelaskan konteks teologi dan sejarah Alkitab untuk pertanyaan kuis ini: "${q.question}" Referensi: ${q.verseRef}. Jawaban benarnya: ${q.options[q.correctIndex]}.`;
    quizBridge?.go?.("voice");
    quizBridge?.askVoice?.(prompt);
  });

  container.querySelector("#quiz-hint-btn")?.addEventListener("click", () => {
    if (quizHintOpen.has(q.id)) quizHintOpen.delete(q.id);
    else quizHintOpen.add(q.id);
    renderDailyBibleQuiz();
  });

  container.querySelector("#quiz-next-btn")?.addEventListener("click", () => {
    if (isLastAnswered && allComplete) {
      container.dataset.quizFinish = "1";
      renderDailyBibleQuiz();
      return;
    }
    if (canGoNext) {
      quizViewIndex = showIdx + 1;
      renderDailyBibleQuiz();
    }
  });

  container.querySelectorAll("[data-quiz-idx]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.getAttribute("data-quiz-idx"));
      if (isNaN(idx)) return;
      quizViewIndex = idx;
      renderDailyBibleQuiz();
    });
  });

  container.querySelectorAll(".quiz-opt-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const qid = btn.getAttribute("data-qid");
      const opt = Number(btn.getAttribute("data-opt"));
      if (!qid || isNaN(opt)) return;

      saveQuizAnswer(qid, opt);
      renderDailyBibleQuiz();
    });
  });
}
