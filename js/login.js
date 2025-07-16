// Firebase Authentication for Login (Google & Email/Password)
// Assumes Firebase SDK is loaded and initialized elsewhere

document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  const errorDiv = document.getElementById("loginError");
  const submitBtn = loginForm
    ? loginForm.querySelector('button[type="submit"]')
    : null;
  const googleBtn = document.getElementById("googleSignInBtn");

  // Redirect if already logged in
  firebase.auth().onAuthStateChanged(function (user) {
    if (user) {
      // Optionally, check user role in Firestore and redirect accordingly
      window.location.href = "marketplace.html";
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
        await firebase.auth().signInWithEmailAndPassword(email, password);
        errorDiv.style.color = "green";
        errorDiv.textContent = "Login successful! Redirecting...";
        setTimeout(() => {
          window.location.href = "marketplace.html";
        }, 1000);
      } catch (err) {
        errorDiv.style.color = "red";
        if (
          err.code === "auth/user-not-found" ||
          err.code === "auth/wrong-password"
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
      const provider = new firebase.auth.GoogleAuthProvider();
      try {
        await firebase.auth().signInWithPopup(provider);
        // Redirect handled by onAuthStateChanged
      } catch (err) {
        errorDiv.style.color = "red";
        errorDiv.textContent = err.message || "Google sign-in failed.";
      }
    });
  }

  // Spinner animation
  const style = document.createElement("style");
  style.innerHTML = `@keyframes spin { 0% { transform: rotate(0deg);} 100% { transform: rotate(360deg);} }`;
  document.head.appendChild(style);
});

// Logout function using Firebase
async function logout() {
  try {
    await firebase.auth().signOut();
  } catch (error) {
    console.error("Logout failed:", error);
  }
  window.location.href = "login.html";
}

// Export minimal auth utils
window.authUtils = {
  logout,
};
