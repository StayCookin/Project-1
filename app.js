// IMPORTANT: dotenv does NOT work in the browser.
// Frontend environment variables are typically set at build time (e.g., Vercel environment variables).
// For this plain JS setup, we'll define it directly.
// In a real deployed scenario, you would set this via Vercel's environment variables
// and inject it into your HTML or JS build process.
// For now, replace this with your deployed Render backend URL.
const API_BASE_URL = "https://project-1-2alx.onrender.com"; // REPLACE THIS WITH YOUR ACTUAL RENDER BACKEND URL!
// Example: const API_BASE_URL = 'https://inrent-backend-service.onrender.com';

// --- UI Message Display Function (Replaces alert()) ---
function displayMessage(message, type = "info") {
  const messageContainer = document.getElementById("message-container");
  if (!messageContainer) {
    console.warn(
      "Message container not found. Displaying via console:",
      message
    );
    return;
  }

  messageContainer.innerHTML = `<div class="p-3 rounded-lg mb-4 text-center ${
    type === "success"
      ? "bg-green-100 text-green-800"
      : type === "error"
      ? "bg-red-100 text-red-800"
      : "bg-blue-100 text-blue-800"
  }">
        ${message}
    </div>`;

  // Clear message after some time
  setTimeout(() => {
    messageContainer.innerHTML = "";
  }, 5000);
}

// --- Modal Functions ---
function showStudentSignup() {
  document.getElementById("student-signup-modal").style.display = "block";
  // Clear any previous messages when opening modal
  displayMessage("");
}

function showLandlordSignup() {
  document.getElementById("landlord-signup-modal").style.display = "block";
  // Clear any previous messages when opening modal
  displayMessage("");
}

// Close modals when clicking the close button or outside the modal
window.onclick = function (event) {
  const modals = document.getElementsByClassName("modal");
  for (let i = 0; i < modals.length; i++) {
    if (event.target === modals[i]) {
      modals[i].style.display = "none";
      displayMessage(""); // Clear message on modal close
    }
  }
};

document.querySelectorAll(".close-modal").forEach((button) => {
  button.onclick = function () {
    const modal = this.closest(".modal");
    modal.style.display = "none";
    displayMessage(""); // Clear message on modal close
  };
});

// --- Form Validation Functions ---
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

function validatePhone(phone) {
  // Botswana phone number format
  // Allows for +267 followed by 7 digits, or 8 digits starting with 7 or 2
  // This is a more robust regex for common Botswana numbers
  return /^(?:\+267)?(?:7[1-8]\d{6}|2[1-9]\d{6})$/.test(phone);
}

// --- Handle form submissions ---
async function handleStudentSignup(e) {
  e.preventDefault();
  const form = e.target;

  // Get form data
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  // Validate form
  if (!validateEmail(data.email)) {
    displayMessage("Please enter a valid email address.", "error");
    return;
  }
  if (!data.username || data.username.trim() === "") {
    displayMessage("Please enter a username.", "error");
    return;
  }
  if (!data.password || data.password.length < 6) {
    displayMessage("Password must be at least 6 characters long.", "error");
    return;
  }
  if (data.password !== data.confirmPassword) {
    displayMessage("Passwords do not match.", "error");
    return;
  }

  // Disable form to prevent multiple submissions
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = "Registering...";
  displayMessage("Registering your account...", "info");

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: data.email,
        username: data.username,
        password: data.password,
      }),
    });

    const result = await response.json();

    if (response.ok) {
      displayMessage(
        result.message ||
          "Student account created successfully! Please check your email for verification.",
        "success"
      );
      form.reset(); // Clear the form
      document.getElementById("student-signup-modal").style.display = "none"; // Close modal
    } else {
      displayMessage(
        result.message || "Registration failed. Please try again.",
        "error"
      );
    }
  } catch (error) {
    console.error("Network or server error during student signup:", error);
    displayMessage(
      "An unexpected error occurred. Please try again later.",
      "error"
    );
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Sign Up";
  }
}

async function handleLandlordSignup(e) {
  e.preventDefault();
  const form = e.target;

  // Get form data
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  // Validate form
  if (!validateEmail(data.email)) {
    displayMessage("Please enter a valid email address.", "error");
    return;
  }
  if (!validatePhone(data.phone)) {
    displayMessage(
      "Please enter a valid Botswana phone number (e.g., +26771234567 or 71234567).",
      "error"
    );
    return;
  }
  if (!data.username || data.username.trim() === "") {
    displayMessage("Please enter a username.", "error");
    return;
  }
  if (!data.password || data.password.length < 6) {
    displayMessage("Password must be at least 6 characters long.", "error");
    return;
  }
  if (data.password !== data.confirmPassword) {
    displayMessage("Passwords do not match.", "error");
    return;
  }

  // Disable form to prevent multiple submissions
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = "Registering...";
  displayMessage("Registering your account...", "info");

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      // Assuming same registration endpoint for now
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: data.email,
        username: data.username,
        password: data.password,
        phone: data.phone, // Include phone for landlord
        role: "landlord", // You might want to send a role
      }),
    });

    const result = await response.json();

    if (response.ok) {
      displayMessage(
        result.message ||
          "Landlord account created successfully! Please check your email for verification.",
        "success"
      );
      form.reset(); // Clear the form
      document.getElementById("landlord-signup-modal").style.display = "none"; // Close modal
    } else {
      displayMessage(
        result.message || "Registration failed. Please try again.",
        "error"
      );
    }
  } catch (error) {
    console.error("Network or server error during landlord signup:", error);
    displayMessage(
      "An unexpected error occurred. Please try again later.",
      "error"
    );
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Sign Up";
  }
}

// Add event listeners to forms
document
  .getElementById("student-signup-form")
  .addEventListener("submit", handleStudentSignup);
document
  .getElementById("landlord-signup-form")
  .addEventListener("submit", handleLandlordSignup);

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
      });
    }
  });
});

// --- Frontend Routes for Email Verification/Password Reset (Needs HTML structure) ---
// These functions would be called based on the URL path, e.g., on a dedicated page.

// Function to handle email verification success/failure page
function handleEmailVerificationPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const status = urlParams.get("status"); // e.g., 'success', 'already-verified', 'failed'

  const messageElement = document.getElementById("verification-message");
  if (messageElement) {
    if (status === "success") {
      messageElement.innerHTML =
        '<h2 class="text-2xl font-bold text-green-700">Email Verified Successfully!</h2><p class="text-gray-700 mt-2">Your InRent account is now active. You can now log in.</p><a href="/login" class="mt-4 inline-block bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700">Go to Login</a>';
    } else if (status === "already-verified") {
      messageElement.innerHTML =
        '<h2 class="text-2xl font-bold text-blue-700">Email Already Verified</h2><p class="text-gray-700 mt-2">Your InRent account has already been verified. You can proceed to log in.</p><a href="/login" class="mt-4 inline-block bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700">Go to Login</a>';
    } else if (status === "failed") {
      messageElement.innerHTML =
        '<h2 class="text-2xl font-bold text-red-700">Email Verification Failed</h2><p class="text-gray-700 mt-2">The verification link is invalid or has expired. Please try registering again or contact support.</p><a href="/register" class="mt-4 inline-block bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700">Register Again</a>';
    } else {
      messageElement.innerHTML =
        '<h2 class="text-2xl font-bold text-gray-700">Verification Status Unknown</h2><p class="text-gray-700 mt-2">Please check your email for a valid verification link.</p>';
    }
  }
}

// Function to handle password reset page
async function handlePasswordResetPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");
  const resetForm = document.getElementById("reset-password-form");
  const messageElement = document.getElementById("reset-password-message");

  if (!token) {
    if (messageElement) {
      messageElement.innerHTML =
        '<h2 class="text-2xl font-bold text-red-700">Invalid Link</h2><p class="text-gray-700 mt-2">No reset token found. Please use the link from your email.</p>';
    }
    if (resetForm) resetForm.style.display = "none"; // Hide form if no token
    return;
  }

  if (resetForm) {
    resetForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const newPassword = document.getElementById("new-password").value;
      const confirmPassword = document.getElementById("confirm-password").value;

      if (newPassword.length < 6) {
        displayMessage(
          "Password must be at least 6 characters long.",
          "error",
          messageElement
        );
        return;
      }
      if (newPassword !== confirmPassword) {
        displayMessage("Passwords do not match.", "error", messageElement);
        return;
      }

      const submitButton = resetForm.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      submitButton.textContent = "Resetting...";
      displayMessage("Resetting your password...", "info", messageElement);

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/auth/reset-password`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, newPassword }),
          }
        );

        const result = await response.json();

        if (response.ok) {
          displayMessage(
            result.message ||
              "Password reset successfully! You can now log in.",
            "success",
            messageElement
          );
          resetForm.reset();
          // Optionally redirect to login after a delay
          setTimeout(() => (window.location.href = "/login"), 3000);
        } else {
          displayMessage(
            result.message || "Password reset failed. Please try again.",
            "error",
            messageElement
          );
        }
      } catch (error) {
        console.error("Network or server error during password reset:", error);
        displayMessage(
          "An unexpected error occurred. Please try again later.",
          "error",
          messageElement
        );
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Reset Password";
      }
    });
  }
}

// --- Initial Page Load Logic ---
document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname;

  if (
    path.includes("/email-verification-success") ||
    path.includes("/email-verification-failed") ||
    path.includes("/email-verified-already")
  ) {
    handleEmailVerificationPage();
  } else if (path.includes("/reset-password")) {
    handlePasswordResetPage();
  }
  // Add other page-specific initializations here if needed
});
