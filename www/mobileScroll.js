/**
 * Scroll aman di dalam .mobile-scroll — hindari scrollIntoView yang menggeser viewport/tab nav.
 */

export function resetViewportScroll() {
  try {
    window.scrollTo(0, 0);
  } catch {
    /* ignore */
  }
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

/**
 * @param {string} sectionId
 * @param {{ behavior?: ScrollBehavior }} [opts]
 */
export function scrollMobileSectionIntoView(sectionId, { behavior = "smooth" } = {}) {
  resetViewportScroll();
  const section = document.getElementById(sectionId);
  if (!section) return;

  const scrollEl = section.closest(".mobile-scroll");
  if (!scrollEl) {
    section.scrollIntoView({ behavior, block: "start" });
    return;
  }

  const scrollRect = scrollEl.getBoundingClientRect();
  const sectionRect = section.getBoundingClientRect();
  const targetTop = scrollEl.scrollTop + (sectionRect.top - scrollRect.top);

  scrollEl.scrollTo({ top: Math.max(0, targetTop), behavior });
}

/**
 * @param {string} sectionId
 * @param {{ behavior?: ScrollBehavior }} [opts]
 */
export function deferScrollMobileSectionIntoView(sectionId, opts) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      scrollMobileSectionIntoView(sectionId, opts);
    });
  });
}
