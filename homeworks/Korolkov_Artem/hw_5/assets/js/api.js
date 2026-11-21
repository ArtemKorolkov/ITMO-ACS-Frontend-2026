"use strict";

// Общий модуль запросов к локальному JSON Server.
// Подключается до скриптов страниц. Пароль в localStorage не пишется:
// там только accessToken и имя, email и id для шапки и форм.

const API_BASE_URL = "http://localhost:3000";

const SESSION_KEYS = {
  token: "dr2_access_token",
  user: "dr2_user"
};

const WEATHER_TAGS = ["cold", "rainy", "hot", "sunny", "snowy", "any"];

let recipeCache = [];
let publicationCache = [];
let favoriteRecords = [];
let likeRecords = [];
let subscriptionRecords = [];
let recipesRequest = null;
let publicationsRequest = null;

function ApiError(message, status) {
  this.name = "ApiError";
  this.message = message;
  this.status = status || 0;
}

ApiError.prototype = Object.create(Error.prototype);

function readSessionJson(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function getAccessToken() {
  try {
    return localStorage.getItem(SESSION_KEYS.token) || "";
  } catch (error) {
    return "";
  }
}

function getCurrentUser() {
  const token = getAccessToken();
  const user = readSessionJson(SESSION_KEYS.user);
  if (!token || !user || typeof user !== "object" || Array.isArray(user)) {
    return null;
  }
  if (user.password) {
    return null;
  }
  if (user.id === undefined || user.id === null) {
    return null;
  }
  if (typeof user.name !== "string" || typeof user.email !== "string") {
    return null;
  }
  if (!user.name.trim() || !user.email.trim()) {
    return null;
  }
  return {
    id: user.id,
    name: user.name.trim(),
    email: user.email.trim()
  };
}

function saveSession(accessToken, user) {
  const safeUser = {
    id: user.id,
    name: String(user.name || "").trim() || "Пользователь",
    email: String(user.email || "").trim()
  };
  localStorage.setItem(SESSION_KEYS.token, accessToken);
  localStorage.setItem(SESSION_KEYS.user, JSON.stringify(safeUser));
  return safeUser;
}

function clearMemoryCaches() {
  favoriteRecords = [];
  likeRecords = [];
  subscriptionRecords = [];
}

function logoutUser() {
  try {
    localStorage.removeItem(SESSION_KEYS.token);
    localStorage.removeItem(SESSION_KEYS.user);
  } catch (error) {
    // Хранилище могло быть закрыто. Память всё равно очищаем ниже.
  }
  clearMemoryCaches();
}

function translateServerMessage(message, status) {
  const text = String(message || "");
  if (text.indexOf("Email already exists") !== -1) {
    return "Этот email уже зарегистрирован. Войдите или укажите другой адрес.";
  }
  if (text.indexOf("Incorrect password") !== -1) {
    return "Неверный пароль.";
  }
  if (text.indexOf("Cannot find user") !== -1) {
    return "Пользователь с таким email не найден. Сначала зарегистрируйтесь.";
  }
  if (text.indexOf("Email and password are required") !== -1) {
    return "Укажите email и пароль.";
  }
  if (text.indexOf("Email format is invalid") !== -1) {
    return "Сервер не принял формат email.";
  }
  if (text.indexOf("Password is too short") !== -1) {
    return "Пароль слишком короткий.";
  }
  if (text.indexOf("jwt expired") !== -1) {
    return "Сессия истекла. Войдите снова.";
  }
  if (text.indexOf("invalid token") !== -1 || text.indexOf("jwt malformed") !== -1 || text.indexOf("invalid signature") !== -1) {
    return "Сессия недействительна. Войдите снова.";
  }
  if (text.indexOf("Missing authorization header") !== -1 || text.indexOf("Missing token") !== -1) {
    return "Для этого действия нужно войти в аккаунт.";
  }
  if (text.indexOf("Private resource") !== -1 || text.indexOf("Read only") !== -1) {
    return "Недостаточно прав для этой операции.";
  }
  if (text) {
    return text;
  }
  return "Сервер вернул ошибку " + status + ".";
}

function parseErrorBody(text) {
  if (!text) {
    return "";
  }
  try {
    const data = JSON.parse(text);
    if (typeof data === "string") {
      return data;
    }
    if (data && typeof data.message === "string") {
      return data.message;
    }
    return text;
  } catch (error) {
    return text;
  }
}

// Универсальный запрос. Сам добавляет Bearer-токен, JSON и проверяет response.ok.
async function apiRequest(path, options) {
  const settings = options || {};
  const method = settings.method || "GET";
  const headers = {
    Accept: "application/json"
  };
  const token = getAccessToken();

  if (settings.auth === true && !token) {
    throw new ApiError("Для этого действия нужно войти в аккаунт.", 401);
  }

  if (token && settings.auth !== false) {
    headers.Authorization = "Bearer " + token;
  }

  if (settings.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  let response;
  try {
    response = await fetch(API_BASE_URL + path, {
      method: method,
      headers: headers,
      body: settings.body !== undefined ? JSON.stringify(settings.body) : undefined
    });
  } catch (error) {
    throw new ApiError("JSON Server недоступен. В папке проекта выполните npm run start:api.", 0);
  }

  if (response.status === 401) {
    const hadToken = Boolean(token);
    const text = await response.text();
    logoutUser();
    const serverMessage = translateServerMessage(parseErrorBody(text), 401);
    if (hadToken) {
      throw new ApiError(serverMessage || "Сессия истекла. Войдите снова.", 401);
    }
    throw new ApiError(serverMessage || "Для этого действия нужно войти в аккаунт.", 401);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(translateServerMessage(parseErrorBody(text), response.status), response.status);
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  return JSON.parse(text);
}

function normalizeRecipe(recipe) {
  const tags = Array.isArray(recipe.weatherTags) ? recipe.weatherTags.filter(function (tag) {
    return WEATHER_TAGS.indexOf(tag) !== -1;
  }) : [];
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
    userId: recipe.userId === undefined || recipe.userId === null ? "" : recipe.userId,
    image: recipe.image || "",
    popularity: Number(recipe.popularity) || 0,
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
    steps: Array.isArray(recipe.steps) ? recipe.steps : [],
    demoComments: Array.isArray(recipe.demoComments) ? recipe.demoComments : [],
    weatherTags: tags.length ? tags : ["any"],
    source: recipe.userId ? "publication" : "catalog"
  };
}

function requireSessionPayload(data) {
  if (!data || !data.accessToken || !data.user) {
    throw new ApiError("Сервер не вернул токен. Повторите попытку.", 500);
  }
  saveSession(data.accessToken, data.user);
  clearMemoryCaches();
  return getCurrentUser();
}

async function registerUser(payload) {
  const data = await apiRequest("/register", {
    method: "POST",
    auth: false,
    body: {
      email: String(payload.email || "").trim(),
      password: payload.password,
      name: String(payload.name || "").trim()
    }
  });
  return requireSessionPayload(data);
}

async function loginUser(email, password) {
  const data = await apiRequest("/login", {
    method: "POST",
    auth: false,
    body: {
      email: String(email || "").trim(),
      password: password
    }
  });
  return requireSessionPayload(data);
}

async function updateUserName(name) {
  const user = getCurrentUser();
  if (!user) {
    throw new ApiError("Для этого действия нужно войти в аккаунт.", 401);
  }
  const updated = await apiRequest("/users/" + encodeURIComponent(user.id), {
    method: "PATCH",
    auth: true,
    body: { name: name }
  });
  saveSession(getAccessToken(), {
    id: user.id,
    email: updated && updated.email ? updated.email : user.email,
    name: updated && updated.name ? updated.name : name
  });
  return getCurrentUser();
}

async function getRecipes(force) {
  if (!force && recipesRequest) {
    return recipesRequest;
  }
  recipesRequest = apiRequest("/recipes").then(function (list) {
    recipeCache = Array.isArray(list) ? list.map(normalizeRecipe) : [];
    return recipeCache;
  }).catch(function (error) {
    recipesRequest = null;
    throw error;
  });
  return recipesRequest;
}

async function getPublications(force) {
  if (!force && publicationsRequest) {
    return publicationsRequest;
  }
  publicationsRequest = apiRequest("/publications").then(function (list) {
    publicationCache = Array.isArray(list) ? list.map(function (item) {
      const recipe = normalizeRecipe(item);
      recipe.source = "publication";
      return recipe;
    }) : [];
    return publicationCache;
  }).catch(function (error) {
    publicationsRequest = null;
    throw error;
  });
  return publicationsRequest;
}

async function getAllRecipes(force) {
  const parts = await Promise.all([getRecipes(force), getPublications(force)]);
  return parts[0].concat(parts[1]);
}

async function findRecipeById(id) {
  if (!id) {
    return null;
  }
  const needle = String(id);
  try {
    const recipe = await apiRequest("/recipes/" + encodeURIComponent(needle));
    if (recipe && recipe.id !== undefined) {
      return normalizeRecipe(recipe);
    }
  } catch (error) {
    if (error.status !== 404) {
      throw error;
    }
  }
  try {
    const publication = await apiRequest("/publications/" + encodeURIComponent(needle));
    if (publication && publication.id !== undefined) {
      const recipe = normalizeRecipe(publication);
      recipe.source = "publication";
      return recipe;
    }
  } catch (error) {
    if (error.status !== 404) {
      throw error;
    }
  }
  return null;
}

function isEmptyPrivateList(error) {
  return error && error.status === 403;
}

async function getFavorites() {
  const user = getCurrentUser();
  if (!user) {
    favoriteRecords = [];
    return [];
  }
  try {
    const list = await apiRequest("/favorites?userId=" + encodeURIComponent(user.id), { auth: true });
    favoriteRecords = Array.isArray(list) ? list.filter(function (item) {
      return item && String(item.userId) === String(user.id);
    }) : [];
  } catch (error) {
    if (!isEmptyPrivateList(error)) {
      throw error;
    }
    favoriteRecords = [];
  }
  return favoriteRecords.slice();
}

function isFavorite(recipeId) {
  return favoriteRecords.some(function (item) {
    return String(item.recipeId) === String(recipeId);
  });
}

async function addFavorite(recipeId) {
  const user = getCurrentUser();
  if (!user) {
    throw new ApiError("Для этого действия нужно войти в аккаунт.", 401);
  }
  const created = await apiRequest("/favorites", {
    method: "POST",
    auth: true,
    body: {
      userId: user.id,
      recipeId: String(recipeId)
    }
  });
  favoriteRecords.push(created);
  return created;
}

async function removeFavorite(recordId) {
  await apiRequest("/favorites/" + encodeURIComponent(recordId), {
    method: "DELETE",
    auth: true
  });
  favoriteRecords = favoriteRecords.filter(function (item) {
    return String(item.id) !== String(recordId);
  });
}

async function toggleFavorite(recipeId) {
  const user = getCurrentUser();
  if (!user) {
    return { ok: false, reason: "auth" };
  }
  const existing = favoriteRecords.find(function (item) {
    return String(item.recipeId) === String(recipeId);
  });
  if (existing) {
    await removeFavorite(existing.id);
  } else {
    await addFavorite(recipeId);
  }
  return { ok: true, saved: isFavorite(recipeId) };
}

async function getLikes() {
  const user = getCurrentUser();
  if (!user) {
    likeRecords = [];
    return [];
  }
  try {
    const list = await apiRequest("/likes?userId=" + encodeURIComponent(user.id), { auth: true });
    likeRecords = Array.isArray(list) ? list.filter(function (item) {
      return item && String(item.userId) === String(user.id);
    }) : [];
  } catch (error) {
    if (!isEmptyPrivateList(error)) {
      throw error;
    }
    likeRecords = [];
  }
  return likeRecords.slice();
}

function isLiked(recipeId) {
  return likeRecords.some(function (item) {
    return String(item.recipeId) === String(recipeId);
  });
}

async function toggleLike(recipeId) {
  const user = getCurrentUser();
  if (!user) {
    return { ok: false, reason: "auth" };
  }
  const existing = likeRecords.find(function (item) {
    return String(item.recipeId) === String(recipeId);
  });
  if (existing) {
    await apiRequest("/likes/" + encodeURIComponent(existing.id), {
      method: "DELETE",
      auth: true
    });
    likeRecords = likeRecords.filter(function (item) {
      return String(item.id) !== String(existing.id);
    });
  } else {
    const created = await apiRequest("/likes", {
      method: "POST",
      auth: true,
      body: {
        userId: user.id,
        recipeId: String(recipeId)
      }
    });
    likeRecords.push(created);
  }
  return { ok: true };
}

async function getSubscriptions() {
  const user = getCurrentUser();
  if (!user) {
    subscriptionRecords = [];
    return [];
  }
  try {
    const list = await apiRequest("/subscriptions?userId=" + encodeURIComponent(user.id), { auth: true });
    subscriptionRecords = Array.isArray(list) ? list.filter(function (item) {
      return item && String(item.userId) === String(user.id);
    }) : [];
  } catch (error) {
    if (!isEmptyPrivateList(error)) {
      throw error;
    }
    subscriptionRecords = [];
  }
  return subscriptionRecords.slice();
}

function isSubscribed(author) {
  return subscriptionRecords.some(function (item) {
    return item.author === author;
  });
}

async function toggleSubscription(author) {
  const user = getCurrentUser();
  if (!user) {
    return { ok: false, reason: "auth" };
  }
  const existing = subscriptionRecords.find(function (item) {
    return item.author === author;
  });
  if (existing) {
    await apiRequest("/subscriptions/" + encodeURIComponent(existing.id), {
      method: "DELETE",
      auth: true
    });
    subscriptionRecords = subscriptionRecords.filter(function (item) {
      return String(item.id) !== String(existing.id);
    });
  } else {
    const created = await apiRequest("/subscriptions", {
      method: "POST",
      auth: true,
      body: {
        userId: user.id,
        author: author
      }
    });
    subscriptionRecords.push(created);
  }
  return { ok: true };
}

async function loadSessionData() {
  if (!getCurrentUser()) {
    clearMemoryCaches();
    return;
  }
  await Promise.all([getFavorites(), getLikes(), getSubscriptions()]);
}

async function getComments(recipeId) {
  const list = await apiRequest("/comments?recipeId=" + encodeURIComponent(recipeId));
  return Array.isArray(list) ? list : [];
}

async function addComment(recipeId, text) {
  const user = getCurrentUser();
  if (!user) {
    throw new ApiError("Войдите, чтобы оставить комментарий.", 401);
  }
  return apiRequest("/comments", {
    method: "POST",
    auth: true,
    body: {
      userId: user.id,
      recipeId: String(recipeId),
      author: user.name,
      text: String(text || "").trim(),
      date: new Date().toLocaleDateString("ru-RU")
    }
  });
}

async function deleteComment(commentId) {
  return apiRequest("/comments/" + encodeURIComponent(commentId), {
    method: "DELETE",
    auth: true
  });
}

function allowedWeatherTags(tags) {
  const selected = Array.isArray(tags) ? tags.filter(function (tag) {
    return WEATHER_TAGS.indexOf(tag) !== -1;
  }) : [];
  return selected.length ? selected : ["any"];
}

async function createRecipe(recipe) {
  const user = getCurrentUser();
  if (!user) {
    throw new ApiError("Войдите, чтобы опубликовать рецепт.", 401);
  }
  const created = await apiRequest("/publications", {
    method: "POST",
    auth: true,
    body: {
      userId: user.id,
      title: recipe.title,
      description: recipe.description,
      category: recipe.category,
      difficulty: recipe.difficulty,
      time: recipe.time,
      servings: recipe.servings,
      author: user.name,
      authorEmail: user.email.toLowerCase(),
      image: recipe.image || "",
      popularity: 1,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      demoComments: [],
      weatherTags: allowedWeatherTags(recipe.weatherTags),
      source: "publication"
    }
  });
  publicationsRequest = null;
  const normalized = normalizeRecipe(created);
  normalized.source = "publication";
  return normalized;
}

async function addPublication(recipe) {
  return createRecipe(recipe);
}

async function deletePublication(id) {
  const user = getCurrentUser();
  await apiRequest("/publications/" + encodeURIComponent(id), {
    method: "DELETE",
    auth: true
  });
  publicationsRequest = null;
  if (!user) {
    return;
  }
  const ownFavorites = favoriteRecords.filter(function (item) {
    return String(item.recipeId) === String(id);
  });
  const ownLikes = likeRecords.filter(function (item) {
    return String(item.recipeId) === String(id);
  });
  for (let i = 0; i < ownFavorites.length; i += 1) {
    await removeFavorite(ownFavorites[i].id);
  }
  for (let j = 0; j < ownLikes.length; j += 1) {
    await apiRequest("/likes/" + encodeURIComponent(ownLikes[j].id), {
      method: "DELETE",
      auth: true
    });
  }
  likeRecords = likeRecords.filter(function (item) {
    return String(item.recipeId) !== String(id);
  });
}

async function renameCurrentUser(newName) {
  const user = await updateUserName(newName);
  const publications = await getPublications(true);
  const own = publications.filter(function (item) {
    return String(item.userId) === String(user.id);
  });
  for (let i = 0; i < own.length; i += 1) {
    await apiRequest("/publications/" + encodeURIComponent(own[i].id), {
      method: "PATCH",
      auth: true,
      body: { author: user.name }
    });
  }
  publicationsRequest = null;
  return true;
}
