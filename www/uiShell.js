/** Enhancement UI — greeting dinamis, scroll polish. */

import { initUiGuard } from "./uiGuard.js";

export function refreshHomeGreeting() {
  const greeting = document.getElementById("home-greeting");
  if (!greeting) return;
  const h = new Date().getHours();
  greeting.textContent =
    h < 11 ? "Selamat pagi" : h < 15 ? "Selamat siang" : h < 18 ? "Selamat sore" : "Selamat malam";
}

export function initUiShell() {
  initUiGuard();
  refreshHomeGreeting();

  document.querySelectorAll(".mobile-scroll").forEach((el) => {
    el.classList.add("scroll-smooth");
  });
}
