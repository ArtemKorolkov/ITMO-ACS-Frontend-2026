"use strict";

// Страница одного рецепта: id берётся из адреса, порции пересчитывают ингредиенты,
// лайк, избранное, подписка и комментарии пишутся в localStorage.

let currentRecipe = null;
let currentServings = 1;

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

function renderComments() {
  const list = document.getElementById("commentList");
  const empty = document.getElementById("commentsEmpty");
  const comments = getCommentsForRecipe(currentRecipe);
  clearElement(list);

  if (comments.length === 0) {
    empty.classList.remove("d-none");
    return;
  }

  empty.classList.add("d-none");
  comments.forEach(function (comment) {
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
    ? "Вы подписаны на автора «" + currentRecipe.author + "». Подписка хранится только в этом браузере и не присылает уведомления."
    : "Подписка демонстрационная: она запоминает имя автора и не присылает уведомления.";

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

function renderRecipePage() {
  document.title = currentRecipe.title + " — Домашние рецепты";
  document.getElementById("recipeTitle").textContent = currentRecipe.title;
  document.getElementById("recipeAuthor").textContent = "Автор: " + currentRecipe.author;
  document.getElementById("recipeCategory").textContent = getCategoryLabel(currentRecipe.category);
  document.getElementById("recipeDifficulty").textContent = getDifficultyLabel(currentRecipe.difficulty);
  document.getElementById("recipeMeta").textContent = formatTime(currentRecipe.time) + " · " + currentRecipe.servings + " порц. в базовом рецепте";
  document.getElementById("recipeDescription").textContent = currentRecipe.description;

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

function initRecipePage() {
  const content = document.getElementById("recipeContent");
  if (!content) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  currentRecipe = findRecipeById(id ? id.trim() : "");

  if (!currentRecipe) {
    showMissingRecipe(id);
    return;
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
    toggleLike(currentRecipe.id);
    updateActionButtons();
  });
  document.getElementById("favoriteButton").addEventListener("click", function () {
    toggleFavorite(currentRecipe.id);
    updateActionButtons();
  });
  document.getElementById("subscribeButton").addEventListener("click", function () {
    toggleSubscription(currentRecipe.author);
    updateActionButtons();
  });

  const commentForm = document.getElementById("commentForm");
  const commentText = document.getElementById("commentText");
  const commentError = document.getElementById("commentError");
  const commentAlert = document.getElementById("commentAlert");

  commentText.addEventListener("input", function () {
    commentText.classList.remove("is-invalid");
    hideAlert(commentAlert);
  });

  commentForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const text = commentText.value.trim();
    if (!text) {
      commentText.classList.add("is-invalid");
      commentError.textContent = "Введите текст комментария.";
      showAlert(commentAlert, "Пустой комментарий не сохранён.", "danger");
      return;
    }
    if (!addComment(currentRecipe.id, text)) {
      showAlert(commentAlert, "Не удалось сохранить комментарий в браузере.", "danger");
      return;
    }
    commentText.value = "";
    commentText.classList.remove("is-invalid");
    renderComments();
    showAlert(commentAlert, "Комментарий добавлен.", "success");
  });
}

document.addEventListener("DOMContentLoaded", function () {
  initRecipePage();
});
