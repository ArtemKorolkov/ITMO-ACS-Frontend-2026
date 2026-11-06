"use strict";

// «Меню на сегодня»: Open-Meteo и подбор рецептов по погодным тегам.
// Координаты используются только для запроса прогноза и не сохраняются.

const GEOCODING_API_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_API_URL = "https://api.open-meteo.com/v1/forecast";
const OPEN_METEO_SITE = "https://open-meteo.com/";

const WEATHER_REASON_LABELS = {
  cold: "холодной",
  rainy: "дождливой",
  hot: "жаркой",
  sunny: "ясной",
  snowy: "снежной"
};

let lastCoordinates = null;
let lastPlaceLabel = "";
let weatherBusy = false;

function describeWeatherCode(code) {
  const value = Number(code);
  if (value === 0) {
    return { text: "Ясное небо", icon: "☀️" };
  }
  if (value === 1) {
    return { text: "Преимущественно ясно", icon: "🌤️" };
  }
  if (value === 2) {
    return { text: "Переменная облачность", icon: "⛅" };
  }
  if (value === 3) {
    return { text: "Пасмурно", icon: "☁️" };
  }
  if (value === 45 || value === 48) {
    return { text: "Туман", icon: "🌫️" };
  }
  if (value >= 51 && value <= 57) {
    return { text: "Морось", icon: "🌦️" };
  }
  if (value >= 61 && value <= 67) {
    return { text: "Дождь", icon: "🌧️" };
  }
  if (value >= 71 && value <= 77) {
    return { text: "Снег", icon: "❄️" };
  }
  if (value >= 80 && value <= 82) {
    return { text: "Ливень", icon: "🌧️" };
  }
  if (value === 85 || value === 86) {
    return { text: "Снежные заряды", icon: "🌨️" };
  }
  if (value >= 95 && value <= 99) {
    return { text: "Гроза", icon: "⛈️" };
  }
  return { text: "Погодные условия, код " + value, icon: "🌡️" };
}

function formatDegrees(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "—";
  }
  const rounded = Math.round(number);
  return (rounded > 0 ? "+" : "") + rounded + " °C";
}

function detectWeatherTags(weatherData) {
  const tags = [];
  const temperature = Number(weatherData.temperature);
  const code = Number(weatherData.weatherCode);
  const probability = Number(weatherData.precipitationProbability);
  const precipitation = Number(weatherData.precipitation);
  const snowy = (code >= 71 && code <= 77) || code === 85 || code === 86;
  const rainyCode = (code >= 51 && code <= 67) || (code >= 80 && code <= 82);

  if (Number.isFinite(temperature) && temperature <= 8) {
    tags.push("cold");
  }
  if (Number.isFinite(temperature) && temperature >= 25) {
    tags.push("hot");
  }
  if (snowy) {
    tags.push("snowy");
  }
  if (rainyCode || (!snowy && ((Number.isFinite(precipitation) && precipitation > 0) || (Number.isFinite(probability) && probability >= 60)))) {
    tags.push("rainy");
  }
  if (code === 0 || code === 1) {
    tags.push("sunny");
  }
  return tags;
}

function recommendationReason(item) {
  if (item.matchCount === 0 && item.hasAny) {
    return "Подходит для любой погоды";
  }
  const words = item.matches.map(function (tag) {
    return WEATHER_REASON_LABELS[tag] || tag;
  });
  if (words.length === 0) {
    return "Есть в домашней коллекции";
  }
  return "Подходит для " + words.join(" и ") + " погоды";
}

// Авторская логика подбора: совпадение weatherTags, затем популярность, затем метка any.
function recommendRecipes(recipes, weatherData) {
  const active = detectWeatherTags(weatherData);
  const ranked = (recipes || []).map(function (recipe) {
    const tags = Array.isArray(recipe.weatherTags) ? recipe.weatherTags : [];
    const matches = active.filter(function (tag) {
      return tags.indexOf(tag) !== -1;
    });
    return {
      recipe: recipe,
      matchCount: matches.length,
      matches: matches,
      hasAny: tags.indexOf("any") !== -1
    };
  });

  const specific = ranked.filter(function (item) {
    return item.matchCount > 0;
  });
  specific.sort(function (a, b) {
    if (b.matchCount !== a.matchCount) {
      return b.matchCount - a.matchCount;
    }
    return (Number(b.recipe.popularity) || 0) - (Number(a.recipe.popularity) || 0);
  });

  const picked = specific.slice(0, 3);
  if (picked.length < 3) {
    const used = {};
    picked.forEach(function (item) {
      used[item.recipe.id] = true;
    });
    const fillers = ranked.filter(function (item) {
      return item.hasAny && !used[item.recipe.id];
    });
    fillers.sort(function (a, b) {
      return (Number(b.recipe.popularity) || 0) - (Number(a.recipe.popularity) || 0);
    });
    fillers.forEach(function (item) {
      if (picked.length < 3) {
        picked.push(item);
      }
    });
  }

  return picked.map(function (item) {
    return {
      recipe: item.recipe,
      matchCount: item.matchCount,
      reason: recommendationReason(item)
    };
  });
}

async function searchCities(name) {
  const params = new URLSearchParams();
  params.set("name", name);
  params.set("count", "5");
  params.set("language", "ru");
  params.set("format", "json");

  let response;
  try {
    response = await fetch(GEOCODING_API_URL + "?" + params.toString());
  } catch (error) {
    throw new Error("Не удалось связаться с Open-Meteo. Проверьте интернет и повторите поиск города.");
  }
  if (!response.ok) {
    throw new Error("Open-Meteo не смог найти город (ошибка " + response.status + ").");
  }
  const data = await response.json();
  return Array.isArray(data.results) ? data.results : [];
}

async function getWeather(latitude, longitude) {
  const params = new URLSearchParams();
  params.set("latitude", String(latitude));
  params.set("longitude", String(longitude));
  params.set("current", "temperature_2m,apparent_temperature,weather_code,precipitation,wind_speed_10m,is_day");
  params.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max");
  params.set("timezone", "auto");
  params.set("forecast_days", "1");

  let response;
  try {
    response = await fetch(FORECAST_API_URL + "?" + params.toString());
  } catch (error) {
    throw new Error("Не удалось связаться с Open-Meteo. Проверьте интернет и нажмите «Обновить погоду».");
  }
  if (!response.ok) {
    throw new Error("Open-Meteo не вернул прогноз (ошибка " + response.status + ").");
  }

  const data = await response.json();
  if (!data.current || !data.daily) {
    throw new Error("Open-Meteo вернул неполный прогноз.");
  }

  const described = describeWeatherCode(data.current.weather_code);
  return {
    latitude: Number(latitude),
    longitude: Number(longitude),
    temperature: data.current.temperature_2m,
    apparentTemperature: data.current.apparent_temperature,
    weatherCode: data.current.weather_code,
    precipitation: data.current.precipitation,
    windSpeed: data.current.wind_speed_10m,
    isDay: data.current.is_day,
    temperatureMax: data.daily.temperature_2m_max ? data.daily.temperature_2m_max[0] : null,
    temperatureMin: data.daily.temperature_2m_min ? data.daily.temperature_2m_min[0] : null,
    precipitationProbability: data.daily.precipitation_probability_max ? data.daily.precipitation_probability_max[0] : null,
    description: described.text,
    icon: described.icon
  };
}

function setWeatherAlert(text, type) {
  const alert = document.getElementById("weatherAlert");
  if (!text) {
    hideAlert(alert);
    return;
  }
  showAlert(alert, text, type || "warning");
}

function setBusy(busy) {
  weatherBusy = busy;
  const ids = ["geoButton", "citySearchButton", "cityInput"];
  ids.forEach(function (id) {
    const element = document.getElementById(id);
    if (element) {
      element.disabled = busy;
    }
  });
  const refresh = document.getElementById("weatherRefreshButton");
  if (refresh) {
    refresh.disabled = busy || !lastCoordinates;
  }
}

function cityLabel(city) {
  const parts = [city.name];
  if (city.admin1 && city.admin1 !== city.name) {
    parts.push(city.admin1);
  }
  if (city.country) {
    parts.push(city.country);
  }
  return parts.join(", ");
}

function hideCityChoices() {
  const list = document.getElementById("cityChoices");
  if (!list) {
    return;
  }
  list.classList.add("d-none");
  clearElement(list);
}

function showCityChoices(cities) {
  const list = document.getElementById("cityChoices");
  hideCityChoices();
  list.classList.remove("d-none");
  cities.forEach(function (city) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "list-group-item list-group-item-action";
    button.textContent = cityLabel(city);
    button.addEventListener("click", function () {
      hideCityChoices();
      loadWeatherForPlace(city.latitude, city.longitude, "Погода: " + cityLabel(city));
    });
    list.appendChild(button);
  });
}

function renderWeatherCard(weather, placeLabel) {
  const card = document.getElementById("weatherCard");
  card.classList.remove("d-none");
  document.getElementById("weatherIcon").textContent = weather.icon;
  document.getElementById("weatherPlace").textContent = placeLabel;
  document.getElementById("weatherTemp").textContent = formatDegrees(weather.temperature);
  document.getElementById("weatherDescription").textContent = weather.description;
  const dayLabel = Number(weather.isDay) === 1 ? "сейчас день" : "сейчас ночь";
  document.getElementById("weatherDetails").textContent = "Ощущается как " + formatDegrees(weather.apparentTemperature)
    + " · днём " + formatDegrees(weather.temperatureMax)
    + " / " + formatDegrees(weather.temperatureMin)
    + " · осадки до " + (weather.precipitationProbability === null || weather.precipitationProbability === undefined ? "—" : weather.precipitationProbability + "%")
    + " · ветер " + (Number.isFinite(Number(weather.windSpeed)) ? Math.round(Number(weather.windSpeed)) + " км/ч" : "—")
    + " · " + dayLabel;
}

async function renderRecommendations(weather) {
  const status = document.getElementById("recommendationsStatus");
  const list = document.getElementById("recommendationsList");
  status.classList.remove("d-none");
  status.textContent = "Подбираем рецепты…";
  clearElement(list);

  let recipes;
  try {
    recipes = await getAllRecipes();
  } catch (error) {
    status.textContent = error.message || "JSON Server недоступен, рекомендации не собраны.";
    return;
  }

  const recommendations = recommendRecipes(recipes, weather);
  if (recommendations.length === 0) {
    status.textContent = "";
    const note = document.createElement("p");
    note.className = "mb-0";
    note.appendChild(document.createTextNode("Подходящих рецептов нет. "));
    const link = document.createElement("a");
    link.href = "search.html";
    link.textContent = "Открыть обычный поиск";
    note.appendChild(link);
    status.appendChild(note);
    return;
  }

  status.textContent = "Рекомендации по текущей погоде:";
  renderRecipeCards(list, recommendations.map(function (item) {
    return item.recipe;
  }), {
    reasonById: recommendations.reduce(function (map, item) {
      map[item.recipe.id] = item.reason;
      return map;
    }, {}),
    openOnClick: true
  });
}

async function loadWeatherForPlace(latitude, longitude, placeLabel) {
  if (weatherBusy) {
    return;
  }
  setBusy(true);
  setWeatherAlert("Загружаем погоду…", "info");
  document.getElementById("recommendationsStatus").classList.remove("d-none");
  document.getElementById("recommendationsStatus").textContent = "Сначала получаем прогноз.";
  try {
    const weather = await getWeather(latitude, longitude);
    lastCoordinates = { latitude: latitude, longitude: longitude };
    lastPlaceLabel = placeLabel;
    setWeatherAlert("", "info");
    renderWeatherCard(weather, placeLabel);
    await renderRecommendations(weather);
  } catch (error) {
    setWeatherAlert(error.message || "Не удалось получить погоду.", "danger");
  } finally {
    setBusy(false);
  }
}

function requestGeolocation() {
  if (!navigator.geolocation) {
    setWeatherAlert("Геолокация недоступна в этом браузере. Найдите город вручную.", "warning");
    return;
  }
  setWeatherAlert("Запрашиваем разрешение на местоположение…", "info");
  navigator.geolocation.getCurrentPosition(function (position) {
    loadWeatherForPlace(
      position.coords.latitude,
      position.coords.longitude,
      "Погода для вашего местоположения"
    );
  }, function (error) {
    if (error && error.code === 1) {
      setWeatherAlert("Браузер не получил доступ к местоположению. Разрешите геолокацию или найдите город вручную.", "warning");
      return;
    }
    setWeatherAlert("Не удалось определить местоположение. Найдите город вручную.", "warning");
  }, {
    enableHighAccuracy: false,
    timeout: 10000,
    maximumAge: 60000
  });
}

async function searchCityFromInput() {
  const input = document.getElementById("cityInput");
  const name = input.value.trim();
  hideCityChoices();
  if (name.length < 2) {
    setWeatherAlert("Введите название города, хотя бы 2 буквы.", "warning");
    return;
  }
  setBusy(true);
  setWeatherAlert("Ищем город…", "info");
  try {
    const cities = await searchCities(name);
    setBusy(false);
    if (cities.length === 0) {
      setWeatherAlert("Город не найден. Проверьте написание или выберите другой город.", "warning");
      return;
    }
    if (cities.length === 1) {
      setWeatherAlert("", "info");
      loadWeatherForPlace(cities[0].latitude, cities[0].longitude, "Погода: " + cityLabel(cities[0]));
      return;
    }
    setWeatherAlert("Найдено несколько городов. Выберите подходящий.", "info");
    showCityChoices(cities);
  } catch (error) {
    setBusy(false);
    setWeatherAlert(error.message || "Не удалось выполнить поиск города.", "danger");
  }
}

function initWeatherBlock() {
  const root = document.getElementById("todayMenu");
  if (!root) {
    return;
  }

  setWeatherAlert("Город ещё не выбран. Нажмите «Определить моё местоположение» или найдите город вручную.", "secondary");
  document.getElementById("recommendationsStatus").textContent = "Рекомендации появятся после получения погоды.";
  document.getElementById("recommendationsStatus").classList.remove("d-none");

  document.getElementById("geoButton").addEventListener("click", requestGeolocation);
  document.getElementById("citySearchButton").addEventListener("click", searchCityFromInput);
  document.getElementById("cityInput").addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      searchCityFromInput();
    }
  });
  document.getElementById("weatherRefreshButton").addEventListener("click", function () {
    if (!lastCoordinates) {
      setWeatherAlert("Сначала выберите город или определите местоположение.", "warning");
      return;
    }
    loadWeatherForPlace(lastCoordinates.latitude, lastCoordinates.longitude, lastPlaceLabel);
  });

  const source = document.getElementById("weatherSource");
  if (source && source.getAttribute("href") !== OPEN_METEO_SITE) {
    source.setAttribute("href", OPEN_METEO_SITE);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  initWeatherBlock();
});
