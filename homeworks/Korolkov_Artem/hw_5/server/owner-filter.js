"use strict";

// Дополнение к JSON Server Auth, а не замена авторизации.
// Правило 600 проверяет JWT и владельца одной записи, но список отдаёт шире,
// чем нужно: достаточно, чтобы в коллекции была хотя бы одна своя запись.
// Здесь список избранного, лайков и подписок принудительно ограничивается id из токена.

const PRIVATE_LISTS = {
  favorites: true,
  likes: true,
  subscriptions: true
};

function stripPasswords(data) {
  if (Array.isArray(data)) {
    return data.map(stripPasswords);
  }
  if (data && typeof data === "object" && Object.prototype.hasOwnProperty.call(data, "password")) {
    const copy = Object.assign({}, data);
    delete copy.password;
    return copy;
  }
  return data;
}

module.exports = function ownerFilter(req, res, next) {
  // json-server отдаёт запись пользователя целиком, включая хеш пароля.
  // Хеш остаётся в db.json, но в ответ браузеру не попадает.
  const send = res.jsonp.bind(res);
  res.jsonp = function (data) {
    return send(stripPasswords(data));
  };

  const url = new URL(req.url, "http://localhost");
  const parts = url.pathname.split("/").filter(function (part) {
    return part !== "";
  });
  const resource = parts[0];
  const id = parts[1];

  if (req.method !== "GET" || !PRIVATE_LISTS[resource] || id) {
    next();
    return;
  }

  if (!req.claims || req.claims.sub === undefined || req.claims.sub === null) {
    res.status(401).jsonp("Missing authorization header");
    return;
  }

  const ownId = String(req.claims.sub);
  const requested = url.searchParams.get("userId");
  if (requested && requested !== ownId) {
    res.status(403).jsonp("Private resource access: entity must have a reference to the owner id");
    return;
  }

  url.searchParams.set("userId", ownId);
  req.query.userId = ownId;
  req.url = url.pathname + "?" + url.searchParams.toString();
  next();
};
