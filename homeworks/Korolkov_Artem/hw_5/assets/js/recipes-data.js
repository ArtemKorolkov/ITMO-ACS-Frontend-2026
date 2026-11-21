"use strict";

// Подписи категорий и сложности. Сами рецепты больше не хранятся в этом файле:
// они перенесены в server/db.json и читаются через assets/js/api.js.
// Так нет двух независимых копий одной и той же коллекции.

const CATEGORY_LABELS = {
  breakfast: "Завтрак",
  salad: "Салат",
  soup: "Суп",
  main: "Основное блюдо",
  dessert: "Десерт"
};

const DIFFICULTY_LABELS = {
  easy: "Лёгкая",
  medium: "Средняя",
  hard: "Сложная"
};

const WEATHER_TAG_LABELS = {
  cold: "Холодная погода",
  rainy: "Дождливая погода",
  hot: "Жаркая погода",
  sunny: "Ясная и солнечная погода",
  snowy: "Снежная погода",
  any: "Любая погода"
};
