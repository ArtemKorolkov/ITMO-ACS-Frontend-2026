"use strict";

/* Переключатель темы. Если человек ещё не нажимал кнопку, сайт следует системе. */

var THEME_KEY = "dr_theme";

function currentTheme() {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function updateThemeButton() {
  var button = document.getElementById("themeToggle");
  if (!button) {
    return;
  }
  var dark = currentTheme() === "dark";
  button.textContent = dark ? "Светлая тема" : "Тёмная тема";
  button.setAttribute("aria-pressed", dark ? "true" : "false");
  button.setAttribute("aria-label", dark ? "Включить светлую тему" : "Включить тёмную тему");
}

function applyTheme(theme, persist) {
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = theme;
  var link = document.getElementById("theme-style");
  if (link) {
    link.href = "assets/css/themes/" + theme + ".css";
  }
  if (persist) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (error) {
      // Без localStorage тема всё равно сменится до перезагрузки.
    }
  }
  updateThemeButton();
}

function initThemeToggle() {
  updateThemeButton();
  var button = document.getElementById("themeToggle");
  if (button) {
    button.addEventListener("click", function () {
      applyTheme(currentTheme() === "dark" ? "light" : "dark", true);
    });
  }
  if (!window.matchMedia) {
    return;
  }
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function (event) {
    var saved = "";
    try {
      saved = localStorage.getItem(THEME_KEY) || "";
    } catch (error) {
      saved = "";
    }
    if (saved === "light" || saved === "dark") {
      return;
    }
    applyTheme(event.matches ? "dark" : "light", false);
  });
}

document.addEventListener("DOMContentLoaded", initThemeToggle);
