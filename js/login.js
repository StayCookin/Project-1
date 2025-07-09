// login.js - Handles login form submission and UI logic

// Set API base URL for local testing
const API_BASE = window.API_BASE_URL || "https://project-1-2alx.onrender.com";

document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  const errorDiv = document.getElementById("loginError");
  const submitBtn = loginForm.querySelector('button[type="submit"]');

  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    errorDiv.textContent = "";
    submitBtn.disabled = true;
    submitBtn.innerHTML =
      '<span class="spinner" style="margin-right:8px;width:16px;height:16px;border:2px solid #fff;border-top:2px solid #228b22;border-radius:50%;display:inline-block;vertical-align:middle;animation:spin 1s linear infinite;"></span>Logging In...';

    const formData = new FormData(loginForm);
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (response.ok) {
        // Store token if provided, then redirect
        if (result.token) {
          localStorage.setItem("token", result.token);
        }
        // Redirect based on user role
        if (result.role === "student") {
          window.location.href = "student-dashboard.html";
        } else if (result.role === "landlord") {
          window.location.href = "landlord-dashboard.html";
        } else {
          window.location.href = "marketplace.html"; // fallback
        }
      } else {
        errorDiv.textContent =
          result.message || "Login failed. Please try again.";
        submitBtn.disabled = false;
        submitBtn.textContent = "Log In";
      }
    } catch (err) {
      errorDiv.textContent = "Network error. Please try again.";
      submitBtn.disabled = false;
      submitBtn.textContent = "Log In";
    }
  });

  // Spinner animation
  const style = document.createElement("style");
  style.innerHTML = `@keyframes spin { 0% { transform: rotate(0deg);} 100% { transform: rotate(360deg);} }`;
  document.head.appendChild(style);
});
