"use strict";

/* Подключается в head до основных стилей.
   Сразу выбирает тему: сохранённый выбор или системную настройку prefers-color-scheme.
   document.write здесь уместен: скрипт выполняется во время разбора head, до первой отрисовки. */

(function () {
  var storageKey = "dr_theme";
  var theme = "light";
  try {
    var saved = localStorage.getItem(storageKey);
    if (saved === "light" || saved === "dark") {
      theme = saved;
    } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      theme = "dark";
    }
  } catch (error) {
    theme = "light";
  }
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = theme;
  document.write('<link id="theme-style" rel="stylesheet" href="assets/css/themes/' + theme + '.css">');
})();
