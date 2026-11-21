"use strict";

// Личный кабинет: данные пользователя, избранное и публикации приходят с JSON Server.

function showGuestState() {
  document.getElementById("guestBlock").classList.remove("d-none");
  document.getElementById("userBlock").classList.add("d-none");
}

function showUserState() {
  const user = getCurrentUser();
  document.getElementById("guestBlock").classList.add("d-none");
  document.getElementById("userBlock").classList.remove("d-none");
  document.getElementById("profileName").textContent = user.name;
  document.getElementById("profileEmail").textContent = user.email;
}

async function renderFavorites() {
  const list = document.getElementById("favoritesList");
  const empty = document.getElementById("favoritesEmpty");
  const count = document.getElementById("favoritesCount");
  const favorites = await getFavorites();
  const recipes = await getAllRecipes();
  const byId = {};
  recipes.forEach(function (recipe) {
    byId[recipe.id] = recipe;
  });
  const cards = favorites.map(function (item) {
    return byId[String(item.recipeId)] || null;
  }).filter(function (recipe) {
    return recipe !== null;
  });

  count.textContent = "В избранном: " + cards.length + " " + pluralRecipes(cards.length);
  if (cards.length === 0) {
    empty.classList.remove("d-none");
    clearElement(list);
    return;
  }
  empty.classList.add("d-none");
  renderRecipeCards(list, cards, {
    onFavoriteChange: function () {
      renderFavorites().catch(function (error) {
        showAlert(document.getElementById("noticeAlert"), error.message || "Не удалось обновить избранное.", "danger");
      });
    }
  });
}

async function getOwnPublications() {
  const user = getCurrentUser();
  if (!user) {
    return [];
  }
  const publications = await getPublications(true);
  return publications.filter(function (item) {
    return String(item.userId) === String(user.id);
  });
}

async function renderPublications() {
  const list = document.getElementById("publicationsList");
  const empty = document.getElementById("publicationsEmpty");
  const recipes = await getOwnPublications();

  if (recipes.length === 0) {
    empty.classList.remove("d-none");
    clearElement(list);
    return;
  }
  empty.classList.add("d-none");
  renderRecipeCards(list, recipes, {
    onDelete: async function (recipe) {
      if (!window.confirm("Удалить эту публикацию с сервера?")) {
        return;
      }
      try {
        await deletePublication(recipe.id);
        await renderPublications();
        await renderFavorites();
        showAlert(document.getElementById("publicationAlert"), "Публикация удалена.", "success");
        document.getElementById("publicationOpenLink").classList.add("d-none");
      } catch (error) {
        showAlert(document.getElementById("publicationAlert"), error.message || "Не удалось удалить публикацию.", "danger");
      }
    }
  });
}

function parseIngredients(text) {
  const lines = text.split("\n").map(function (line) {
    return line.trim();
  }).filter(function (line) {
    return line !== "";
  });
  const items = [];

  for (let i = 0; i < lines.length; i += 1) {
    const parts = lines[i].split(";").map(function (part) {
      return part.trim();
    });
    if (parts.length < 3 || !parts[0] || !parts[2]) {
      return {
        error: "Строка " + (i + 1) + ": укажите название, количество и единицу через точку с запятой."
      };
    }
    const amount = Number(parts[1].replace(",", "."));
    if (!Number.isFinite(amount) || amount < 0) {
      return {
        error: "Строка " + (i + 1) + ": количество должно быть числом, например 200 или 0."
      };
    }
    items.push({
      name: parts[0],
      amount: amount === 0 ? null : amount,
      unit: parts[2]
    });
  }

  if (items.length === 0) {
    return { error: "Добавьте хотя бы один ингредиент." };
  }
  return { items: items };
}

function parseSteps(text) {
  return text.split("\n").map(function (line) {
    return line.trim();
  }).filter(function (line) {
    return line !== "";
  });
}

function collectWeatherTags() {
  const selected = [];
  document.querySelectorAll("#publicationForm input[name='weatherTag']:checked").forEach(function (input) {
    selected.push(input.value);
  });
  return selected;
}

function initNameModal() {
  const modalElement = document.getElementById("editNameModal");
  const nameInput = document.getElementById("newNameInput");
  const saveButton = document.getElementById("saveNameBtn");
  if (!modalElement || !nameInput || !saveButton) {
    return;
  }

  modalElement.addEventListener("show.bs.modal", function () {
    const user = getCurrentUser();
    nameInput.value = user ? user.name : "";
    nameInput.classList.remove("is-invalid");
  });

  saveButton.addEventListener("click", async function () {
    const name = nameInput.value.trim();
    if (name.length < 2 || name.length > 40) {
      nameInput.classList.add("is-invalid");
      return;
    }
    saveButton.disabled = true;
    try {
      const saved = await renameCurrentUser(name);
      if (!saved) {
        showAlert(document.getElementById("noticeAlert"), "Не удалось сохранить имя.", "danger");
        return;
      }
      nameInput.classList.remove("is-invalid");
      document.getElementById("profileName").textContent = name;
      updateNavbarUser();
      await renderPublications();
      const modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
      modal.hide();
      showAlert(document.getElementById("noticeAlert"), "Имя изменено.", "success");
    } catch (error) {
      showAlert(document.getElementById("noticeAlert"), error.message || "Не удалось сохранить имя.", "danger");
    } finally {
      saveButton.disabled = false;
    }
  });
}

function initPublicationForm() {
  const form = document.getElementById("publicationForm");
  if (!form) {
    return;
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    const alert = document.getElementById("publicationAlert");
    const openLink = document.getElementById("publicationOpenLink");
    hideAlert(alert);
    openLink.classList.add("d-none");

    const user = getCurrentUser();
    if (!user) {
      showAlert(alert, "Сначала войдите, чтобы публиковать рецепты.", "danger");
      return;
    }

    const title = document.getElementById("pubTitle").value.trim();
    const description = document.getElementById("pubDescription").value.trim();
    const category = document.getElementById("pubCategory").value;
    const difficulty = document.getElementById("pubDifficulty").value;
    const time = Number(document.getElementById("pubTime").value);
    const servings = Number(document.getElementById("pubServings").value);
    const image = document.getElementById("pubImage").value.trim();
    const parsedIngredients = parseIngredients(document.getElementById("pubIngredients").value);
    const steps = parseSteps(document.getElementById("pubSteps").value);
    const errors = [];

    if (title.length < 3) {
      errors.push("Название должно содержать хотя бы 3 символа.");
    }
    if (description.length < 10) {
      errors.push("Опишите блюдо хотя бы в нескольких словах (от 10 символов).");
    }
    if (!CATEGORY_LABELS[category]) {
      errors.push("Выберите тип блюда.");
    }
    if (!DIFFICULTY_LABELS[difficulty]) {
      errors.push("Выберите сложность.");
    }
    if (!Number.isInteger(time) || time < 1 || time > 600) {
      errors.push("Укажите время приготовления от 1 до 600 минут.");
    }
    if (!Number.isInteger(servings) || servings < 1 || servings > 24) {
      errors.push("Укажите количество порций от 1 до 24.");
    }
    if (parsedIngredients.error) {
      errors.push(parsedIngredients.error);
    }
    if (steps.length === 0) {
      errors.push("Добавьте хотя бы один шаг приготовления.");
    }
    if (image && !isSafeImageUrl(image)) {
      errors.push("Ссылка на фото должна начинаться с http:// или https://. Поле можно оставить пустым.");
    }

    if (errors.length > 0) {
      showErrorList(alert, errors);
      return;
    }

    const submitButton = form.querySelector("button[type='submit']");
    submitButton.disabled = true;
    try {
      const recipe = await createRecipe({
        title: title,
        description: description,
        category: category,
        difficulty: difficulty,
        time: time,
        servings: servings,
        image: image,
        ingredients: parsedIngredients.items,
        steps: steps,
        weatherTags: collectWeatherTags()
      });
      form.reset();
      await renderPublications();
      showAlert(alert, "Рецепт сохранён на сервере и доступен в поиске.", "success");
      openLink.href = "recipe.html?id=" + encodeURIComponent(recipe.id);
      openLink.classList.remove("d-none");
    } catch (error) {
      showAlert(alert, error.message || "Не удалось сохранить публикацию.", "danger");
    } finally {
      submitButton.disabled = false;
    }
  });
}

async function initProfilePage() {
  const guestBlock = document.getElementById("guestBlock");
  if (!guestBlock) {
    return;
  }

  const notice = consumeNotice();
  if (notice) {
    showAlert(document.getElementById("noticeAlert"), notice, "success");
  }

  if (!getCurrentUser()) {
    showGuestState();
    return;
  }

  showUserState();
  initNameModal();
  initPublicationForm();
  document.getElementById("logoutButton").addEventListener("click", function () {
    logoutUser();
    window.location.href = "index.html";
  });

  try {
    await renderFavorites();
    await renderPublications();
  } catch (error) {
    if (!getCurrentUser()) {
      showGuestState();
      showAlert(document.getElementById("noticeAlert"), error.message || "Сессия истекла. Войдите снова.", "warning");
      return;
    }
    showAlert(document.getElementById("noticeAlert"), error.message || "Не удалось загрузить кабинет.", "danger");
  }
}

document.addEventListener("DOMContentLoaded", function () {
  initProfilePage();
});
