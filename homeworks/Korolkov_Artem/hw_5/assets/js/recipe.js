"use strict";

// Страница одного рецепта. Данные, избранное и комментарии читаются с JSON Server.

let currentRecipe = null;
let currentServings = 1;
let currentComments = [];

function showMissingRecipe(id) {
  const missing = document.getElementById("recipeMissing");
  const content = document.getElementById("recipeContent");
  const missingId = document.getElementById("missingId");
  missing.classList.remove("d-none");
  content.classList.add("d-none");
  missingId.textContent = id || "не указан";
  document.title = "Рецепт не найден — Домашние рецепты";
}

function renderIngredients() {
  const list = document.getElementById("ingredientList");
  clearElement(list);
  currentRecipe.ingredients.forEach(function (item) {
    const row = document.createElement("li");
    row.className = "list-group-item";
    row.textContent = ingredientLabel(item, currentRecipe.servings, currentServings);
    list.appendChild(row);
  });
  if (currentRecipe.ingredients.length === 0) {
    const row = document.createElement("li");
    row.className = "list-group-item";
    row.textContent = "Ингредиенты не указаны.";
    list.appendChild(row);
  }
}

function renderSteps() {
  const list = document.getElementById("stepList");
  clearElement(list);
  currentRecipe.steps.forEach(function (step) {
    const row = document.createElement("li");
    row.className = "list-group-item";
    row.textContent = step;
    list.appendChild(row);
  });
  if (currentRecipe.steps.length === 0) {
    const row = document.createElement("li");
    row.className = "list-group-item";
    row.textContent = "Шаги приготовления не указаны.";
    list.appendChild(row);
  }
}

function weatherTagsLabel(tags) {
  return (tags || []).map(function (tag) {
    if (typeof WEATHER_TAG_LABELS !== "undefined" && WEATHER_TAG_LABELS[tag]) {
      return WEATHER_TAG_LABELS[tag].toLowerCase();
    }
    return tag;
  }).join(", ");
}

function renderComments() {
  const list = document.getElementById("commentList");
  const empty = document.getElementById("commentsEmpty");
  const user = getCurrentUser();
  clearElement(list);

  if (currentComments.length === 0) {
    empty.classList.remove("d-none");
    return;
  }

  empty.classList.add("d-none");
  currentComments.forEach(function (comment) {
    const item = document.createElement("li");
    item.className = "comment-item";

    const author = document.createElement("strong");
    author.textContent = typeof comment.author === "string" && comment.author.trim() ? comment.author : "Гость";

    const date = document.createElement("span");
    date.className = "comment-date";
    date.textContent = comment.date ? " · " + comment.date : "";

    const text = document.createElement("p");
    text.className = "mb-0 mt-1";
    text.textContent = comment.text;

    item.appendChild(author);
    item.appendChild(date);
    item.appendChild(text);

    if (user && comment.userId !== undefined && String(comment.userId) === String(user.id)) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "btn btn-outline-secondary btn-sm mt-2";
      button.textContent = "Удалить";
      button.addEventListener("click", async function () {
        button.disabled = true;
        try {
          await deleteComment(comment.id);
          currentComments = currentComments.filter(function (itemComment) {
            return String(itemComment.id) !== String(comment.id);
          });
          renderComments();
          showAlert(document.getElementById("commentAlert"), "Комментарий удалён.", "success");
        } catch (error) {
          button.disabled = false;
          showAlert(document.getElementById("commentAlert"), error.message || "Не удалось удалить комментарий.", "danger");
        }
      });
      item.appendChild(button);
    }

    list.appendChild(item);
  });
}

function updateActionButtons() {
  const likeButton = document.getElementById("likeButton");
  const favoriteButton = document.getElementById("favoriteButton");
  const subscribeButton = document.getElementById("subscribeButton");
  const subscribeStatus = document.getElementById("subscribeStatus");
  const popularity = document.getElementById("recipePopularity");
  const liked = isLiked(currentRecipe.id);
  const saved = isFavorite(currentRecipe.id);
  const subscribed = isSubscribed(currentRecipe.author);

  likeButton.textContent = liked ? "Понравилось" : "Нравится";
  likeButton.setAttribute("aria-pressed", liked ? "true" : "false");

  favoriteButton.textContent = saved ? "В избранном" : "В избранное";
  favoriteButton.setAttribute("aria-pressed", saved ? "true" : "false");

  subscribeButton.textContent = subscribed ? "Отписаться" : "Подписаться на автора";
  subscribeButton.setAttribute("aria-pressed", subscribed ? "true" : "false");

  subscribeStatus.textContent = subscribed
    ? "Вы подписаны на автора «" + currentRecipe.author + "». Подписка хранится в вашем аккаунте и не присылает уведомления."
    : "Подписка запоминает имя автора в вашем аккаунте и не присылает уведомления.";

  popularity.textContent = "Популярность: " + (currentRecipe.popularity + (liked ? 1 : 0));
}

function setServings(value) {
  const next = Math.round(Number(value));
  if (!Number.isFinite(next) || next < 1 || next > 24) {
    document.getElementById("servingsInput").value = String(currentServings);
    return;
  }
  currentServings = next;
  document.getElementById("servingsInput").value = String(currentServings);
  renderIngredients();
}

async function runProtectedAction(action) {
  if (!getCurrentUser()) {
    showPageNotice("Войдите, чтобы сохранить это действие в аккаунте.", "warning");
    return;
  }
  try {
    const result = await action();
    if (result && result.ok === false && result.reason === "auth") {
      showPageNotice("Войдите, чтобы сохранить это действие в аккаунте.", "warning");
      return;
    }
    updateActionButtons();
  } catch (error) {
    showPageNotice(error.message || "Не удалось сохранить действие.", "danger");
  }
}

function renderRecipePage() {
  document.title = currentRecipe.title + " — Домашние рецепты";
  document.getElementById("recipeTitle").textContent = currentRecipe.title;
  document.getElementById("recipeAuthor").textContent = "Автор: " + currentRecipe.author;
  document.getElementById("recipeCategory").textContent = getCategoryLabel(currentRecipe.category);
  document.getElementById("recipeDifficulty").textContent = getDifficultyLabel(currentRecipe.difficulty);
  document.getElementById("recipeMeta").textContent = formatTime(currentRecipe.time) + " · " + currentRecipe.servings + " порц. в базовом рецепте";
  document.getElementById("recipeDescription").textContent = currentRecipe.description;
  document.getElementById("recipeWeather").textContent = "Погодные теги: " + weatherTagsLabel(currentRecipe.weatherTags);

  const photo = document.getElementById("recipePhoto");
  clearElement(photo);
  setRecipeImage(photo, currentRecipe, "recipe-photo-large", false);

  const videoLink = document.getElementById("videoLink");
  videoLink.href = "https://www.youtube.com/results?search_query=" + encodeURIComponent(currentRecipe.title + " рецепт");

  currentServings = currentRecipe.servings || 1;
  document.getElementById("servingsInput").value = String(currentServings);
  renderIngredients();
  renderSteps();
  renderComments();
  updateActionButtons();

  document.getElementById("recipeMissing").classList.add("d-none");
  document.getElementById("recipeContent").classList.remove("d-none");
}

async function loadCurrentComments() {
  const serverComments = await getComments(currentRecipe.id);
  const demo = Array.isArray(currentRecipe.demoComments) ? currentRecipe.demoComments : [];
  currentComments = demo.concat(serverComments).filter(function (item) {
    return item && typeof item.text === "string" && item.text.trim() !== "";
  });
}

async function initRecipePage() {
  const content = document.getElementById("recipeContent");
  if (!content) {
    return;
  }

  const status = document.getElementById("recipeStatus");
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (status) {
    status.classList.remove("d-none");
    status.className = "alert alert-info";
    status.textContent = "Загружаем рецепт…";
  }

  try {
    currentRecipe = await findRecipeById(id ? id.trim() : "");
  } catch (error) {
    if (status) {
      status.className = "alert alert-danger";
      status.textContent = error.message || "Не удалось загрузить рецепт.";
    }
    return;
  }

  if (!currentRecipe) {
    if (status) {
      status.classList.add("d-none");
    }
    showMissingRecipe(id);
    return;
  }

  try {
    await loadSessionData();
    await loadCurrentComments();
  } catch (error) {
    showPageNotice(error.message || "Часть данных аккаунта не загрузилась.", "warning");
  }

  if (status) {
    status.classList.add("d-none");
  }
  renderRecipePage();

  document.getElementById("servingsMinus").addEventListener("click", function () {
    setServings(currentServings - 1);
  });
  document.getElementById("servingsPlus").addEventListener("click", function () {
    setServings(currentServings + 1);
  });
  document.getElementById("servingsInput").addEventListener("change", function (event) {
    setServings(event.target.value);
  });

  document.getElementById("likeButton").addEventListener("click", function () {
    runProtectedAction(function () {
      return toggleLike(currentRecipe.id);
    });
  });
  document.getElementById("favoriteButton").addEventListener("click", function () {
    runProtectedAction(function () {
      return toggleFavorite(currentRecipe.id);
    });
  });
  document.getElementById("subscribeButton").addEventListener("click", function () {
    runProtectedAction(function () {
      return toggleSubscription(currentRecipe.author);
    });
  });

  const commentForm = document.getElementById("commentForm");
  const commentText = document.getElementById("commentText");
  const commentError = document.getElementById("commentError");
  const commentAlert = document.getElementById("commentAlert");

  commentText.addEventListener("input", function () {
    commentText.classList.remove("is-invalid");
    hideAlert(commentAlert);
  });

  commentForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    const text = commentText.value.trim();
    if (!getCurrentUser()) {
      showAlert(commentAlert, "Войдите, чтобы оставить комментарий. Гостевые комментарии больше не пишутся в браузер.", "warning");
      return;
    }
    if (!text) {
      commentText.classList.add("is-invalid");
      commentError.textContent = "Введите текст комментария.";
      showAlert(commentAlert, "Пустой комментарий не сохранён.", "danger");
      return;
    }
    try {
      const created = await addComment(currentRecipe.id, text);
      currentComments.push(created);
      commentText.value = "";
      commentText.classList.remove("is-invalid");
      renderComments();
      showAlert(commentAlert, "Комментарий добавлен.", "success");
    } catch (error) {
      showAlert(commentAlert, error.message || "Не удалось сохранить комментарий.", "danger");
    }
  });
}

document.addEventListener("DOMContentLoaded", function () {
  initRecipePage();
});
