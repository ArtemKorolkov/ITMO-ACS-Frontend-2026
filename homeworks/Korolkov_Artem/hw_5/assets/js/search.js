"use strict";

// Поиск и фильтры. Список приходит с JSON Server и перерисовывается без перезагрузки страницы.

let searchRecipes = [];
let searchReady = false;

function recipeMatchesQuery(recipe, query) {
  if (!query) {
    return true;
  }
  const text = (recipe.title + " " + recipe.description).toLowerCase();
  return text.includes(query);
}

function recipeMatchesIngredient(recipe, ingredient) {
  if (!ingredient) {
    return true;
  }
  return recipe.ingredients.some(function (item) {
    const name = item && item.name ? String(item.name).toLowerCase() : "";
    return name.includes(ingredient);
  });
}

function sortRecipes(list, sortKey) {
  const copy = list.slice();
  if (sortKey === "time-asc") {
    copy.sort(function (a, b) {
      return a.time - b.time;
    });
  } else if (sortKey === "time-desc") {
    copy.sort(function (a, b) {
      return b.time - a.time;
    });
  } else {
    copy.sort(function (a, b) {
      return b.popularity - a.popularity;
    });
  }
  return copy;
}

function applyFilters() {
  if (!searchReady) {
    return;
  }
  const query = document.getElementById("searchQuery").value.trim().toLowerCase();
  const ingredient = document.getElementById("ingredientQuery").value.trim().toLowerCase();
  const category = document.getElementById("categoryFilter").value;
  const difficulty = document.getElementById("difficultyFilter").value;
  const sortKey = document.getElementById("sortSelect").value;

  const filtered = searchRecipes.filter(function (recipe) {
    const matchesQuery = recipeMatchesQuery(recipe, query);
    const matchesIngredient = recipeMatchesIngredient(recipe, ingredient);
    const matchesCategory = category === "all" || recipe.category === category;
    const matchesDifficulty = difficulty === "all" || recipe.difficulty === difficulty;
    return matchesQuery && matchesIngredient && matchesCategory && matchesDifficulty;
  });

  renderSearchResults(sortRecipes(filtered, sortKey));
}

function renderSearchResults(recipes) {
  const resultsCount = document.getElementById("resultsCount");
  const emptyState = document.getElementById("emptyState");
  const resultsList = document.getElementById("resultsList");

  resultsCount.textContent = "Найдено: " + recipes.length + " " + pluralRecipes(recipes.length);

  if (recipes.length === 0) {
    emptyState.classList.remove("d-none");
    clearElement(resultsList);
    return;
  }

  emptyState.classList.add("d-none");
  renderRecipeCards(resultsList, recipes);
}

function resetFilters() {
  document.getElementById("searchQuery").value = "";
  document.getElementById("ingredientQuery").value = "";
  document.getElementById("categoryFilter").value = "all";
  document.getElementById("difficultyFilter").value = "all";
  document.getElementById("sortSelect").value = "popularity";
  applyFilters();
}

async function initSearchPage() {
  const form = document.getElementById("searchForm");
  if (!form) {
    return;
  }

  const status = document.getElementById("searchStatus");
  if (status) {
    status.classList.remove("d-none");
    status.className = "alert alert-info";
    status.textContent = "Загружаем рецепты…";
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    applyFilters();
  });
  document.getElementById("searchQuery").addEventListener("input", applyFilters);
  document.getElementById("ingredientQuery").addEventListener("input", applyFilters);
  document.getElementById("categoryFilter").addEventListener("change", applyFilters);
  document.getElementById("difficultyFilter").addEventListener("change", applyFilters);
  document.getElementById("sortSelect").addEventListener("change", applyFilters);
  document.getElementById("resetFilters").addEventListener("click", resetFilters);

  try {
    searchRecipes = await getAllRecipes();
    try {
      await loadSessionData();
    } catch (error) {
      showPageNotice(error.message || "Не удалось загрузить избранное.", "warning");
    }
    searchReady = true;
    if (status) {
      status.classList.add("d-none");
    }
    applyFilters();
  } catch (error) {
    searchReady = false;
    if (status) {
      status.className = "alert alert-danger";
      status.textContent = error.message || "Не удалось загрузить рецепты.";
    }
    document.getElementById("resultsCount").textContent = "";
  }
}

document.addEventListener("DOMContentLoaded", function () {
  initSearchPage();
});
