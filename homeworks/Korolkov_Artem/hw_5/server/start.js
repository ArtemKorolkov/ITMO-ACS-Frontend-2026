"use strict";

// Запасной запуск, если команда json-server-auth из package.json не стартует.
// Использует те же db.json, routes.json и middleware JSON Server Auth.
// Это не самодельная проверка пароля: регистрацию и JWT выполняет json-server-auth.

const path = require("path");
const jsonServer = require("json-server");
const auth = require("json-server-auth");
const ownerFilter = require("./owner-filter");

const app = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, "db.json"));
const rules = require("./routes.json");

app.db = router.db;
app.use(jsonServer.defaults());
app.use(auth.rewriter(rules));
app.use(auth);
app.use(ownerFilter);
app.use(router);

app.listen(3000, function () {
  console.log("JSON Server Auth запущен: http://localhost:3000");
});
