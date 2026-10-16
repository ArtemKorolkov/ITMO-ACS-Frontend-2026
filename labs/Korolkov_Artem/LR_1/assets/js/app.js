"use strict";

// Общая логика сайта «Домашние рецепты».
// Здесь хранение в localStorage, подписи, карточки рецептов и состояние шапки.
// Страничные скрипты подключаются после этого файла и вызывают эти функции.

const STORAGE_KEYS = {
  user: "dr_user",
  users: "dr_users",
  favorites: "dr_favorites",
  likes: "dr_likes",
  subscriptions: "dr_subscriptions",
  comments: "dr_comments",
  publications: "dr_publications"
};

const NOTICE_KEY = "dr_notice";

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return fallback;
    }
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    return false;
  }
}

function readArray(key) {
  const value = readStorage(key, []);
  return Array.isArray(value) ? value : [];
}

function readObject(key) {
  const value = readStorage(key, {});
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value;
}

function getCurrentUser() {
  const user = readStorage(STORAGE_KEYS.user, null);
  if (!user || typeof user !== "object" || Array.isArray(user)) {
    return null;
  }
  if (typeof user.name !== "string" || typeof user.email !== "string") {
    return null;
  }
  if (!user.name.trim() || !user.email.trim()) {
    return null;
  }
  return {
    name: user.name.trim(),
    email: user.email.trim()
  };
}

function setCurrentUser(user) {
  return writeStorage(STORAGE_KEYS.user, {
    name: String(user.name).trim(),
    email: String(user.email).trim()
  });
}

function clearCurrentUser() {
  try {
    localStorage.removeItem(STORAGE_KEYS.user);
    return true;
  } catch (error) {
    return false;
  }
}

function getRegisteredUsers() {
  return readArray(STORAGE_KEYS.users).filter(function (item) {
    return item && typeof item.name === "string" && typeof item.email === "string";
  }).map(function (item) {
    return {
      name: item.name.trim(),
      email: item.email.trim()
    };
  });
}

function findUserByEmail(email) {
  const needle = String(email || "").trim().toLowerCase();
  return getRegisteredUsers().find(function (user) {
    return user.email.toLowerCase() === needle;
  }) || null;
}

function rememberUserProfile(user) {
  const email = String(user.email).trim();
  const name = String(user.name).trim();
  const users = getRegisteredUsers().filter(function (item) {
    return item.email.toLowerCase() !== email.toLowerCase();
  });
  users.push({ name: name, email: email });
  return writeStorage(STORAGE_KEYS.users, users);
}

function renameCurrentUser(newName) {
  const user = getCurrentUser();
  if (!user) {
    return false;
  }
  const nextUser = { name: newName.trim(), email: user.email };
  const userSaved = setCurrentUser(nextUser);
  const listSaved = rememberUserProfile(nextUser);
  const publications = getPublications().map(function (item) {
    if (item.authorEmail && item.authorEmail === user.email.toLowerCase()) {
      item.author = nextUser.name;
    }
    return item;
  });
  const publicationsSaved = writeStorage(STORAGE_KEYS.publications, publications);
  return userSaved && listSaved && publicationsSaved;
}

function getFavorites() {
  return readArray(STORAGE_KEYS.favorites).filter(function (id) {
    return typeof id === "string";
  });
}

function isFavorite(id) {
  return getFavorites().includes(id);
}

function toggleFavorite(id) {
  const list = getFavorites();
  const index = list.indexOf(id);
  if (index === -1) {
    list.push(id);
  } else {
    list.splice(index, 1);
  }
  return writeStorage(STORAGE_KEYS.favorites, list);
}

function getLikes() {
  return readArray(STORAGE_KEYS.likes).filter(function (id) {
    return typeof id === "string";
  });
}

function isLiked(id) {
  return getLikes().includes(id);
}

function toggleLike(id) {
  const list = getLikes();
  const index = list.indexOf(id);
  if (index === -1) {
    list.push(id);
  } else {
    list.splice(index, 1);
  }
  return writeStorage(STORAGE_KEYS.likes, list);
}

function getSubscriptions() {
  return readArray(STORAGE_KEYS.subscriptions).filter(function (name) {
    return typeof name === "string";
  });
}

function isSubscribed(author) {
  return getSubscriptions().includes(author);
}

function toggleSubscription(author) {
  const list = getSubscriptions();
  const index = list.indexOf(author);
  if (index === -1) {
    list.push(author);
  } else {
    list.splice(index, 1);
  }
  return writeStorage(STORAGE_KEYS.subscriptions, list);
}

function getUserComments() {
  const stored = readObject(STORAGE_KEYS.comments);
  const result = {};
  Object.keys(stored).forEach(function (recipeId) {
    if (Array.isArray(stored[recipeId])) {
      result[recipeId] = stored[recipeId];
    }
  });
  return result;
}

function getCommentsForRecipe(recipe) {
  const stored = getUserComments()[recipe.id];
  const userComments = Array.isArray(stored) ? stored : [];
  const demo = Array.isArray(recipe.demoComments) ? recipe.demoComments : [];
  return demo.concat(userComments).filter(function (item) {
    return item && typeof item.text === "string" && item.text.trim() !== "";
  });
}

function addComment(recipeId, text) {
  const user = getCurrentUser();
  const comment = {
    author: user ? user.name : "Гость",
    text: text.trim(),
    date: new Date().toLocaleDateString("ru-RU")
  };
  const all = getUserComments();
  if (!Array.isArray(all[recipeId])) {
    all[recipeId] = [];
  }
  all[recipeId].push(comment);
  return writeStorage(STORAGE_KEYS.comments, all);
}

function getPublications() {
  return readArray(STORAGE_KEYS.publications).filter(function (item) {
    return item && typeof item.id === "string" && typeof item.title === "string";
  });
}

function addPublication(recipe) {
  const list = getPublications();
  list.push(recipe);
  return writeStorage(STORAGE_KEYS.publications, list);
}

function deletePublication(id) {
  const publications = getPublications().filter(function (item) {
    return item.id !== id;
  });
  const favorites = getFavorites().filter(function (itemId) {
    return itemId !== id;
  });
  const likes = getLikes().filter(function (itemId) {
    return itemId !== id;
  });
  const comments = getUserComments();
  delete comments[id];
  return writeStorage(STORAGE_KEYS.publications, publications)
    && writeStorage(STORAGE_KEYS.favorites, favorites)
    && writeStorage(STORAGE_KEYS.likes, likes)
    && writeStorage(STORAGE_KEYS.comments, comments);
}

function normalizeRecipe(recipe) {
  return {
    id: String(recipe.id),
    title: recipe.title || "Без названия",
    description: recipe.description || "",
    category: recipe.category || "main",
    difficulty: recipe.difficulty || "easy",
    time: Number(recipe.time) || 0,
    servings: Number(recipe.servings) || 1,
    author: recipe.author || "Автор",
    authorEmail: recipe.authorEmail || "",
    image: recipe.image || "",
    popularity: Number(recipe.popularity) || 0,
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
    steps: Array.isArray(recipe.steps) ? recipe.steps : [],
    demoComments: Array.isArray(recipe.demoComments) ? recipe.demoComments : []
  };
}

function getAllRecipes() {
  const base = (typeof RECIPES !== "undefined" && Array.isArray(RECIPES)) ? RECIPES : [];
  return base.concat(getPublications()).map(normalizeRecipe);
}

function findRecipeById(id) {
  if (!id) {
    return null;
  }
  return getAllRecipes().find(function (recipe) {
    return recipe.id === id;
  }) || null;
}

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
  button.addEventListener("click", function () {
    toggleFavorite(recipe.id);
    updateText();
    if (typeof onChange === "function") {
      onChange();
    }
  });
  return button;
}

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

  const title = document.createElement("h3");
  title.className = "h5 card-title";
  title.textContent = recipe.title;

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
  body.appendChild(actions);
  card.appendChild(body);
  column.appendChild(card);
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
      clearCurrentUser();
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

function initHomePage() {
  const popularList = document.getElementById("popularList");
  if (!popularList) {
    return;
  }
  const popular = getAllRecipes().slice().sort(function (a, b) {
    return b.popularity - a.popularity;
  }).slice(0, 6);
  renderRecipeCards(popularList, popular);
  updateJoinBlock();
}

document.addEventListener("DOMContentLoaded", function () {
  setupNavbar();
  initHomePage();
});
