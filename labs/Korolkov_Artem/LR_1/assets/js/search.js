"use strict";

// Поиск и фильтры. Страница не перезагружается: список перерисовывается при каждом изменении полей.

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
  const query = document.getElementById("searchQuery").value.trim().toLowerCase();
  const ingredient = document.getElementById("ingredientQuery").value.trim().toLowerCase();
  const category = document.getElementById("categoryFilter").value;
  const difficulty = document.getElementById("difficultyFilter").value;
  const sortKey = document.getElementById("sortSelect").value;

  const filtered = getAllRecipes().filter(function (recipe) {
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

function initSearchPage() {
  const form = document.getElementById("searchForm");
  if (!form) {
    return;
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

  applyFilters();
}

document.addEventListener("DOMContentLoaded", function () {
  initSearchPage();
});
