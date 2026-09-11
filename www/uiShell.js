/** Enhancement UI — greeting dinamis, scroll polish. */

import { initUiGuard } from "./uiGuard.js";
import { getGreetingPhrase } from "./uiStrings.js";

export function refreshHomeGreeting() {
  const greeting = document.getElementById("home-greeting");
  if (!greeting || greeting.dataset.userGreeting) return;
  greeting.textContent = getGreetingPhrase();
}

export function initUiShell() {
  initUiGuard();
  refreshHomeGreeting();

  document.querySelectorAll(".mobile-scroll").forEach((el) => {
    el.classList.add("scroll-smooth");
  });

  document.addEventListener("rhema-locale-ui-applied", () => refreshHomeGreeting());
}
