const API_BASE = window.API_BASE_URL || "https://project-1-2alx.onrender.com";

// Token management functions - simplified for database storage
function setSessionToken(token) {
  // Store only a session identifier, not the full token
  sessionStorage.setItem("sessionId", token);
}

function getSessionToken() {
  return sessionStorage.getItem("sessionId");
}

function clearSessionToken() {
  sessionStorage.removeItem("sessionId");
}

// Check if user is authenticated (server-side validation)
async function isAuthenticated() {
  const sessionId = getSessionToken();
  if (!sessionId) return false;

  try {
    const response = await fetch(`${API_BASE}/api/auth/verify-session`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${sessionId}`,
        "Content-Type": "application/json",
      },
    });

    return response.ok;
  } catch (error) {
    console.error("Session verification failed:", error);
    return false;
  }
}

document.addEventListener("DOMContentLoaded", async function () {
  const loginForm = document.getElementById("loginForm");
  const errorDiv = document.getElementById("loginError");
  const submitBtn = loginForm.querySelector('button[type="submit"]');

  // Check if user is already logged in
  if (await isAuthenticated()) {
    window.location.href = "marketplace.html";
    return;
  }

  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    errorDiv.textContent = "";
    submitBtn.disabled = true;
    submitBtn.innerHTML =
      '<span class="spinner" style="margin-right:8px;width:16px;height:16px;border:2px solid #fff;border-top:2px solid #228b22;border-radius:50%;display:inline-block;vertical-align:middle;animation:spin 1s linear infinite;"></span>Logging In...';

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    // Basic validation
    if (!email || !password) {
      errorDiv.textContent = "Please fill in all fields.";
      submitBtn.disabled = false;
      submitBtn.textContent = "Log In";
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errorDiv.textContent = "Please enter a valid email address.";
      submitBtn.disabled = false;
      submitBtn.textContent = "Log In";
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Store session token (server manages the actual auth token in database)
        if (result.sessionToken) {
          setSessionToken(result.sessionToken);
        }

        errorDiv.style.color = "green";
        errorDiv.textContent = "Login successful! Redirecting...";

        setTimeout(() => {
          if (result.role === "student") {
            window.location.href = "student-dashboard.html";
          } else if (result.role === "landlord") {
            window.location.href = "landlord-dashboard.html";
          } else {
            window.location.href = "marketplace.html";
          }
        }, 1000);
      } else {
        let errorMessage = "Login failed. Please try again.";

        if (result.message) {
          errorMessage = result.message;
        } else if (response.status === 401) {
          errorMessage = "Invalid email or password.";
        } else if (response.status === 403) {
          errorMessage = "Account not verified. Please check your email.";
        } else if (response.status === 429) {
          errorMessage = "Too many login attempts. Please try again later.";
        }

        errorDiv.style.color = "red";
        errorDiv.textContent = errorMessage;
        submitBtn.disabled = false;
        submitBtn.textContent = "Log In";
      }
    } catch (err) {
      console.error("Login error:", err);
      errorDiv.style.color = "red";
      errorDiv.textContent =
        "Network error. Please check your connection and try again.";
      submitBtn.disabled = false;
      submitBtn.textContent = "Log In";
    }
  });

  // Spinner animation
  const style = document.createElement("style");
  style.innerHTML = `@keyframes spin { 0% { transform: rotate(0deg);} 100% { transform: rotate(360deg);} }`;
  document.head.appendChild(style);
});

// Logout function - calls server to invalidate session
async function logout() {
  const sessionId = getSessionToken();

  if (sessionId) {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionId}`,
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Logout request failed:", error);
    }
  }

  clearSessionToken();
  window.location.href = "login.html";
}

// Check authentication for protected pages
async function requireAuth() {
  if (!(await isAuthenticated())) {
    clearSessionToken();
    window.location.href = "login.html";
    return false;
  }
  return true;
}

// Utility function for making authenticated API requests
async function authenticatedFetch(url, options = {}) {
  const sessionId = getSessionToken();

  if (!sessionId) {
    throw new Error("No session token available");
  }

  const authHeaders = {
    Authorization: `Bearer ${sessionId}`,
    "Content-Type": "application/json",
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers: authHeaders,
  });

  // If unauthorized, clear session and redirect to login
  if (response.status === 401) {
    clearSessionToken();
    window.location.href = "login.html";
    return null;
  }

  return response;
}

// Export functions for use in other files
window.authUtils = {
  isAuthenticated,
  logout,
  requireAuth,
  authenticatedFetch,
};
