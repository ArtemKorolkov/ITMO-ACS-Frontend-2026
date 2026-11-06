"use strict";

// Общая логика сайта «Домашние рецепты».
// Данные приходят из api.js. Здесь остаются подписи, карточки и состояние шапки.

const NOTICE_KEY = "dr2_notice";

function getCategoryLabel(key) {
  if (typeof CATEGORY_LABELS !== "undefined" && CATEGORY_LABELS[key]) {
    return CATEGORY_LABELS[key];
  }
  return key || "Без категории";
}

function getDifficultyLabel(key) {
  if (typeof DIFFICULTY_LABELS !== "undefined" && DIFFICULTY_LABELS[key]) {
    return DIFFICULTY_LABELS[key];
  }
  return key || "Не указана";
}

function formatTime(minutes) {
  return (Number(minutes) || 0) + " мин.";
}

function formatAmount(value) {
  const rounded = Math.round(Number(value) * 10) / 10;
  if (Number.isInteger(rounded)) {
    return String(rounded);
  }
  return String(rounded).replace(".", ",");
}

function scaleAmount(amount, baseServings, nextServings) {
  const base = Number(baseServings) || 1;
  const next = Number(nextServings) || 1;
  return (Number(amount) * next) / base;
}

function ingredientLabel(item, baseServings, nextServings) {
  const name = item && item.name ? item.name : "Ингредиент";
  const unit = item && item.unit ? item.unit : "";
  if (!item || item.amount === null || item.amount === undefined || item.amount === "") {
    return name + " — " + (unit || "по вкусу");
  }
  const scaled = scaleAmount(item.amount, baseServings, nextServings);
  return formatAmount(scaled) + " " + unit + " " + name;
}

function pluralRecipes(count) {
  const abs = Math.abs(count) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) {
    return "рецептов";
  }
  if (last === 1) {
    return "рецепт";
  }
  if (last >= 2 && last <= 4) {
    return "рецепта";
  }
  return "рецептов";
}

function shortenText(text, limit) {
  const value = String(text || "");
  if (value.length <= limit) {
    return value;
  }
  return value.slice(0, limit).trim() + "…";
}

function isSafeImageUrl(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url.trim());
}

function clearElement(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

function showAlert(element, text, type) {
  if (!element) {
    return;
  }
  element.className = "alert alert-" + type;
  element.textContent = text;
}

function hideAlert(element) {
  if (!element) {
    return;
  }
  element.className = "alert d-none";
  element.textContent = "";
}

function showErrorList(element, errors) {
  if (!element) {
    return;
  }
  element.className = "alert alert-danger";
  clearElement(element);
  const list = document.createElement("ul");
  list.className = "mb-0";
  errors.forEach(function (error) {
    const item = document.createElement("li");
    item.textContent = error;
    list.appendChild(item);
  });
  element.appendChild(list);
}

function showPageNotice(text, type) {
  let element = document.getElementById("pageNotice");
  if (!element) {
    const main = document.querySelector("main");
    if (!main) {
      window.alert(text);
      return;
    }
    element = document.createElement("div");
    element.id = "pageNotice";
    element.setAttribute("role", "status");
    main.insertBefore(element, main.firstChild);
  }
  showAlert(element, text, type || "warning");
}

function saveNotice(text) {
  try {
    sessionStorage.setItem(NOTICE_KEY, text);
  } catch (error) {
    // Уведомление необязательное: без него переход всё равно выполнится.
  }
}

function consumeNotice() {
  try {
    const text = sessionStorage.getItem(NOTICE_KEY);
    sessionStorage.removeItem(NOTICE_KEY);
    return text || "";
  } catch (error) {
    return "";
  }
}

function createPhotoFallback(title, className) {
  const box = document.createElement("div");
  box.className = "photo-fallback";
  if (className && className.indexOf("large") !== -1) {
    box.classList.add("photo-fallback-large");
  }
  box.setAttribute("role", "img");
  box.setAttribute("aria-label", "Изображение недоступно: " + title);
  const mark = document.createElement("span");
  mark.className = "photo-fallback-mark";
  mark.textContent = "📖";
  const caption = document.createElement("span");
  caption.textContent = title;
  box.appendChild(mark);
  box.appendChild(caption);
  return box;
}

function setRecipeImage(parent, recipe, className, lazy) {
  if (!isSafeImageUrl(recipe.image)) {
    parent.appendChild(createPhotoFallback(recipe.title, className));
    return;
  }
  const image = document.createElement("img");
  image.className = "recipe-photo " + className;
  image.alt = "Фото блюда: " + recipe.title;
  if (lazy) {
    image.loading = "lazy";
  }
  image.src = recipe.image.trim();
  image.addEventListener("error", function () {
    image.replaceWith(createPhotoFallback(recipe.title, className));
  });
  parent.appendChild(image);
}

function createFavoriteButton(recipe, onChange) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn btn-outline-success";

  function updateText() {
    const saved = isFavorite(recipe.id);
    button.textContent = saved ? "В избранном" : "В избранное";
    button.setAttribute("aria-pressed", saved ? "true" : "false");
    button.setAttribute("aria-label", (saved ? "Убрать из избранного: " : "Сохранить в избранное: ") + recipe.title);
  }

  updateText();
  button.addEventListener("click", async function () {
    if (!getCurrentUser()) {
      showPageNotice("Войдите, чтобы сохранять избранное в своём аккаунте.", "warning");
      return;
    }
    button.disabled = true;
    try {
      const result = await toggleFavorite(recipe.id);
      if (!result.ok && result.reason === "auth") {
        showPageNotice("Войдите, чтобы сохранять избранное в своём аккаунте.", "warning");
        return;
      }
      updateText();
      if (typeof onChange === "function") {
        onChange();
      }
    } catch (error) {
      showPageNotice(error.message || "Не удалось обновить избранное.", "danger");
    } finally {
      button.disabled = false;
    }
  });
  return button;
}

let cardSequence = 0;

function createRecipeCard(recipe, options) {
  const settings = options || {};
  const column = document.createElement("div");
  column.className = "col-12 col-sm-6 col-lg-4";

  const card = document.createElement("article");
  card.className = "card recipe-card h-100";
  card.dataset.recipeId = recipe.id;

  setRecipeImage(card, recipe, "card-img-top", true);

  const body = document.createElement("div");
  body.className = "card-body d-flex flex-column";

  const badge = document.createElement("span");
  badge.className = "badge badge-category mb-2";
  badge.textContent = getCategoryLabel(recipe.category);

  cardSequence += 1;
  const title = document.createElement("h3");
  title.className = "h5 card-title";
  title.id = "recipe-card-title-" + cardSequence;
  title.textContent = recipe.title;
  card.setAttribute("aria-labelledby", title.id);

  const meta = document.createElement("p");
  meta.className = "recipe-meta";
  meta.textContent = formatTime(recipe.time) + " · " + getDifficultyLabel(recipe.difficulty);

  const description = document.createElement("p");
  description.className = "card-text";
  description.textContent = shortenText(recipe.description, 110);

  const actions = document.createElement("div");
  actions.className = "d-flex flex-wrap gap-2 mt-auto pt-2";

  const openLink = document.createElement("a");
  openLink.className = "btn btn-primary";
  openLink.href = "recipe.html?id=" + encodeURIComponent(recipe.id);
  openLink.textContent = "Открыть рецепт";
  actions.appendChild(openLink);

  if (settings.showFavorite !== false) {
    actions.appendChild(createFavoriteButton(recipe, settings.onFavoriteChange));
  }

  if (typeof settings.onDelete === "function") {
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "btn btn-outline-secondary";
    deleteButton.textContent = "Удалить";
    deleteButton.setAttribute("aria-label", "Удалить публикацию: " + recipe.title);
    deleteButton.addEventListener("click", function () {
      settings.onDelete(recipe);
    });
    actions.appendChild(deleteButton);
  }

  body.appendChild(badge);
  body.appendChild(title);
  body.appendChild(meta);
  body.appendChild(description);

  const reasonText = settings.reason || (settings.reasonById && settings.reasonById[recipe.id]);
  if (reasonText) {
    const reason = document.createElement("p");
    reason.className = "hint mb-0";
    reason.textContent = reasonText;
    body.appendChild(reason);
  }

  body.appendChild(actions);
  card.appendChild(body);
  column.appendChild(card);

  if (settings.openOnClick) {
    card.classList.add("recipe-card-clickable");
    card.addEventListener("click", function (event) {
      if (event.target.closest("a, button")) {
        return;
      }
      window.location.href = "recipe.html?id=" + encodeURIComponent(recipe.id);
    });
  }

  return column;
}

function renderRecipeCards(container, recipes, options) {
  clearElement(container);
  recipes.forEach(function (recipe) {
    container.appendChild(createRecipeCard(recipe, options));
  });
}

function updateNavbarUser() {
  const item = document.getElementById("navUserItem");
  const nameElement = document.getElementById("navUserName");
  const user = getCurrentUser();
  if (!item || !nameElement) {
    return;
  }
  if (user) {
    item.classList.remove("d-none");
    nameElement.textContent = user.name;
  } else {
    item.classList.add("d-none");
    nameElement.textContent = "";
  }
}

function setupNavbar() {
  const page = document.body.dataset.page || "";
  const links = document.querySelectorAll("[data-nav]");
  links.forEach(function (link) {
    if (link.dataset.nav === page) {
      link.classList.add("active");
      link.setAttribute("aria-current", "page");
    }
  });

  updateNavbarUser();

  const authLink = document.getElementById("authLink");
  const user = getCurrentUser();
  if (authLink && user) {
    authLink.classList.remove("active");
    authLink.removeAttribute("aria-current");
    authLink.textContent = "Выйти";
    authLink.href = "index.html";
    authLink.addEventListener("click", function (event) {
      event.preventDefault();
      logoutUser();
      window.location.href = "index.html";
    });
  }
}

function updateJoinBlock() {
  const joinText = document.getElementById("joinText");
  const joinActions = document.getElementById("joinActions");
  if (!joinText || !joinActions) {
    return;
  }
  const user = getCurrentUser();
  if (!user) {
    return;
  }
  joinText.textContent = user.name + ", ваши рецепты и избранное собраны в личном кабинете.";
  clearElement(joinActions);
  const link = document.createElement("a");
  link.className = "btn btn-primary";
  link.href = "profile.html";
  link.textContent = "Открыть кабинет";
  joinActions.appendChild(link);
}

async function initHomePage() {
  const popularList = document.getElementById("popularList");
  if (!popularList) {
    return;
  }
  const status = document.getElementById("popularStatus");
  if (status) {
    status.classList.remove("d-none");
    status.textContent = "Загружаем рецепты…";
  }
  try {
    const recipes = await getAllRecipes();
    try {
      await loadSessionData();
    } catch (error) {
      updateNavbarUser();
      showPageNotice(error.message || "Не удалось загрузить избранное.", "warning");
    }
    const popular = recipes.slice().sort(function (a, b) {
      return b.popularity - a.popularity;
    }).slice(0, 6);
    renderRecipeCards(popularList, popular);
    if (status) {
      status.classList.add("d-none");
      status.textContent = "";
    }
  } catch (error) {
    clearElement(popularList);
    if (status) {
      status.classList.remove("d-none");
      status.textContent = error.message || "Не удалось загрузить рецепты.";
    }
  }
  updateJoinBlock();
}

document.addEventListener("DOMContentLoaded", function () {
  setupNavbar();
  initHomePage();
});
