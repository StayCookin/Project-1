// Firebase Authentication for Login (Google & Email/Password)
// Using Firebase v9+ modular SDK

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";

// Firebase configuration (same as your signup)
const firebaseConfig = {
  apiKey: "AIzaSyAXKk5gRjwSGK_g9f_HP_f4y4445e_8l4w",
  authDomain: "project-1-1e31c.firebaseapp.com",
  projectId: "project-1-1e31c",
  storageBucket: "project-1-1e31c.firebasestorage.app",
  messagingSenderId: "658275930203",
  appId: "1:658275930203:web:afc2e2a249509737b0ef7e",
};

// Initialize Firebase
let app, auth;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  console.log("Firebase initialized successfully for login");
} catch (err) {
  console.error("Firebase initialization failed:", err);
}

document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  const errorDiv = document.getElementById("loginError");
  const submitBtn = loginForm
    ? loginForm.querySelector('button[type="submit"]')
    : null;
  const googleBtn = document.getElementById("googleSignInBtn");

  // Redirect if already logged in
  onAuthStateChanged(auth, function (user) {
    if (user) {
      console.log("User already authenticated, redirecting to marketplace");
      window.location.href = "/marketplace";
    }
  });

  // Email/Password Login
  if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      errorDiv.textContent = "";
      submitBtn.disabled = true;
      submitBtn.innerHTML =
        '<span class="spinner" style="margin-right:8px;width:16px;height:16px;border:2px solid #fff;border-top:2px solid #228b22;border-radius:50%;display:inline-block;vertical-align:middle;animation:spin 1s linear infinite;"></span>Logging In...';

      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;

      if (!email || !password) {
        errorDiv.textContent = "Please fill in all fields.";
        submitBtn.disabled = false;
        submitBtn.textContent = "Log In";
        return;
      }

      try {
        await signInWithEmailAndPassword(auth, email, password);
        errorDiv.style.color = "green";
        errorDiv.textContent = "Login successful! Redirecting...";
        setTimeout(() => {
          window.location.href = "/marketplace";
        }, 1000);
      } catch (err) {
        errorDiv.style.color = "red";
        if (
          err.code === "auth/user-not-found" ||
          err.code === "auth/wrong-password" ||
          err.code === "auth/invalid-credential"
        ) {
          errorDiv.textContent = "Invalid email or password.";
        } else if (err.code === "auth/too-many-requests") {
          errorDiv.textContent =
            "Too many login attempts. Please try again later.";
        } else if (err.code === "auth/user-disabled") {
          errorDiv.textContent = "Account disabled. Please contact support.";
        } else {
          errorDiv.textContent =
            err.message || "Login failed. Please try again.";
        }
        submitBtn.disabled = false;
        submitBtn.textContent = "Log In";
      }
    });
  }

  // Google Sign-In
  if (googleBtn) {
    googleBtn.addEventListener("click", async function () {
      const provider = new GoogleAuthProvider();
      try {
        await signInWithPopup(auth, provider);
        // Redirect handled by onAuthStateChanged
      } catch (err) {
        errorDiv.style.color = "red";
        if (err.code === "auth/popup-closed-by-user") {
          errorDiv.textContent = "Sign-in cancelled.";
        } else if (err.code === "auth/popup-blocked") {
          errorDiv.textContent = "Popup blocked. Please allow popups and try again.";
        } else {
          errorDiv.textContent = err.message || "Google sign-in failed.";
        }
      }
    });
  }

  // Spinner animation
  const style = document.createElement("style");
  style.innerHTML = `@keyframes spin { 0% { transform: rotate(0deg);} 100% { transform: rotate(360deg);} }`;
  document.head.appendChild(style);
});

// Logout function using Firebase v9+
async function logout() {
  try {
    await signOut(auth);
    console.log("User signed out successfully");
  } catch (error) {
    console.error("Logout failed:", error);
  }
  window.location.href = "/login";
}

// Export minimal auth utils
window.authUtils = {
  logout,
};