"use strict";

// Формы входа и регистрации. Пароль уходит только в JSON Server Auth и не сохраняется в браузере.

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

  form.addEventListener("submit", async function (event) {
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

    const submitButton = form.querySelector("button[type='submit']");
    submitButton.disabled = true;
    try {
      await loginUser(email, password);
      saveNotice("Вы вошли. Токен сохранён в этом браузере, пароль не сохраняется.");
      window.location.href = "profile.html";
    } catch (error) {
      showAlert(alert, error.message || "Не удалось войти.", "danger");
      submitButton.disabled = false;
    }
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

  form.addEventListener("submit", async function (event) {
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

    const submitButton = form.querySelector("button[type='submit']");
    submitButton.disabled = true;
    try {
      await registerUser({ name: name, email: email, password: password });
      saveNotice("Регистрация выполнена. Сервер вернул токен, пароль в браузере не сохранён.");
      window.location.href = "profile.html";
    } catch (error) {
      showAlert(alert, error.message || "Не удалось зарегистрироваться.", "danger");
      submitButton.disabled = false;
    }
  });
}

document.addEventListener("DOMContentLoaded", function () {
  initLoginForm();
  initRegisterForm();
});
