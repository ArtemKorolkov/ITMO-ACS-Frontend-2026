"use strict";

// Проверка форм входа и регистрации.
// Пароль используется только для проверки длины и сразу забывается: в localStorage его нет.

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function nameFromEmail(email) {
  const local = String(email).split("@")[0].replace(/[._\-+]+/g, " ").trim();
  if (local.length < 2) {
    return "Гость кухни";
  }
  return local.charAt(0).toUpperCase() + local.slice(1);
}

function setFieldError(input, errorElement, message) {
  input.classList.add("is-invalid");
  input.setAttribute("aria-invalid", "true");
  if (errorElement) {
    errorElement.textContent = message;
  }
}

function clearFieldError(input) {
  input.classList.remove("is-invalid");
  input.removeAttribute("aria-invalid");
}

function bindClearError(input) {
  input.addEventListener("input", function () {
    clearFieldError(input);
  });
}

function initPasswordToggle(buttonId, inputId) {
  const button = document.getElementById(buttonId);
  const input = document.getElementById(inputId);
  if (!button || !input) {
    return;
  }
  button.addEventListener("click", function () {
    const hidden = input.type === "password";
    input.type = hidden ? "text" : "password";
    button.textContent = hidden ? "Скрыть" : "Показать";
    button.setAttribute("aria-label", hidden ? "Скрыть пароль" : "Показать пароль");
  });
}

function initLoginForm() {
  const form = document.getElementById("loginForm");
  if (!form) {
    return;
  }

  const emailInput = document.getElementById("loginEmail");
  const passwordInput = document.getElementById("loginPassword");
  const emailError = document.getElementById("loginEmailError");
  const passwordError = document.getElementById("loginPasswordError");
  const alert = document.getElementById("loginAlert");

  initPasswordToggle("toggleLoginPassword", "loginPassword");
  bindClearError(emailInput);
  bindClearError(passwordInput);

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    hideAlert(alert);

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    let valid = true;

    clearFieldError(emailInput);
    clearFieldError(passwordInput);

    if (!email) {
      setFieldError(emailInput, emailError, "Введите email.");
      valid = false;
    } else if (!isValidEmail(email)) {
      setFieldError(emailInput, emailError, "Введите корректный email, например name@example.com.");
      valid = false;
    }

    if (!password) {
      setFieldError(passwordInput, passwordError, "Введите пароль.");
      valid = false;
    } else if (password.length < 6) {
      setFieldError(passwordInput, passwordError, "Пароль должен содержать не меньше 6 символов.");
      valid = false;
    }

    if (!valid) {
      showAlert(alert, "Проверьте поля формы. Вход не выполнен.", "danger");
      return;
    }

    const existing = findUserByEmail(email);
    const profile = existing
      ? { name: existing.name, email: existing.email }
      : { name: nameFromEmail(email), email: email };

    if (!rememberUserProfile(profile) || !setCurrentUser(profile)) {
      showAlert(alert, "Браузер не дал сохранить профиль. Проверьте, что localStorage не заблокирован.", "danger");
      return;
    }

    saveNotice("Вы вошли в демонстрационный кабинет. Пароль не сохранён.");
    window.location.href = "profile.html";
  });
}

function initRegisterForm() {
  const form = document.getElementById("registerForm");
  if (!form) {
    return;
  }

  const nameInput = document.getElementById("registerName");
  const emailInput = document.getElementById("registerEmail");
  const passwordInput = document.getElementById("registerPassword");
  const confirmInput = document.getElementById("registerConfirm");
  const nameError = document.getElementById("registerNameError");
  const emailError = document.getElementById("registerEmailError");
  const passwordError = document.getElementById("registerPasswordError");
  const confirmError = document.getElementById("registerConfirmError");
  const alert = document.getElementById("registerAlert");

  initPasswordToggle("toggleRegisterPassword", "registerPassword");
  initPasswordToggle("toggleRegisterConfirm", "registerConfirm");
  bindClearError(nameInput);
  bindClearError(emailInput);
  bindClearError(passwordInput);
  bindClearError(confirmInput);

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    hideAlert(alert);

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirm = confirmInput.value;
    let valid = true;

    clearFieldError(nameInput);
    clearFieldError(emailInput);
    clearFieldError(passwordInput);
    clearFieldError(confirmInput);

    if (name.length < 2 || name.length > 40) {
      setFieldError(nameInput, nameError, "Введите имя от 2 до 40 символов.");
      valid = false;
    }

    if (!email) {
      setFieldError(emailInput, emailError, "Введите email.");
      valid = false;
    } else if (!isValidEmail(email)) {
      setFieldError(emailInput, emailError, "Введите корректный email, например name@example.com.");
      valid = false;
    } else if (findUserByEmail(email)) {
      setFieldError(emailInput, emailError, "Этот email уже есть в демонстрационном списке. Войдите или укажите другой адрес.");
      valid = false;
    }

    if (!password) {
      setFieldError(passwordInput, passwordError, "Введите пароль.");
      valid = false;
    } else if (password.length < 6) {
      setFieldError(passwordInput, passwordError, "Пароль должен содержать не меньше 6 символов.");
      valid = false;
    }

    if (!confirm) {
      setFieldError(confirmInput, confirmError, "Повторите пароль.");
      valid = false;
    } else if (password !== confirm) {
      setFieldError(confirmInput, confirmError, "Пароли не совпадают.");
      valid = false;
    }

    if (!valid) {
      showAlert(alert, "Исправьте отмеченные поля. Регистрация не выполнена.", "danger");
      return;
    }

    const profile = { name: name, email: email };
    if (!rememberUserProfile(profile) || !setCurrentUser(profile)) {
      showAlert(alert, "Браузер не дал сохранить профиль. Проверьте, что localStorage не заблокирован.", "danger");
      return;
    }

    saveNotice("Регистрация выполнена в учебном режиме. Сохранены только имя и email.");
    window.location.href = "profile.html";
  });
}

document.addEventListener("DOMContentLoaded", function () {
  initLoginForm();
  initRegisterForm();
});
