// frontend/app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

// Initialize Firebase
const firebaseConfig = {
  /* Your Firebase config */
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const realtimeDb = getDatabase(app);

// --- UI Message Display Function ---
function displayMessage(
  message,
  type = "info",
  containerId = "message-container"
) {
  const messageContainer = document.getElementById(containerId);
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
  setTimeout(() => {
    messageContainer.innerHTML = "";
  }, 5000);
}

// --- Modal Functions ---
function showStudentSignup() {
  document.getElementById("student-signup-modal").style.display = "block";
  displayMessage("");
}

function showLandlordSignup() {
  document.getElementById("landlord-signup-modal").style.display = "block";
  displayMessage("");
}

// Close modals
window.onclick = function (event) {
  const modals = document.getElementsByClassName("modal");
  for (let i = 0; i < modals.length; i++) {
    if (event.target === modals[i]) {
      modals[i].style.display = "none";
      displayMessage("");
    }
  }
};

document.querySelectorAll(".close-modal").forEach((button) => {
  button.onclick = function () {
    const modal = this.closest(".modal");
    modal.style.display = "none";
    displayMessage("");
  };
});

// --- Form Validation Functions ---
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

function validatePhone(phone) {
  return /^(?:\+267)?(?:7[1-8]\d{6}|2[1-9]\d{6})$/.test(phone);
}

// --- Handle form submissions ---
async function handleStudentSignup(e) {
  e.preventDefault();
  const form = e.target;
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

  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = "Registering...";
  displayMessage("Registering your account...", "info");

  try {
    const { user } = await createUserWithEmailAndPassword(
      auth,
      data.email,
      data.password
    );
    await setDoc(doc(db, "users", user.uid), {
      email: data.email,
      username: data.username,
      role: "student",
      createdAt: new Date().toISOString(),
    });
    displayMessage("Student account created successfully!", "success");
    form.reset();
    document.getElementById("student-signup-modal").style.display = "none";
    window.location.href = "/student-dashboard";
  } catch (error) {
    console.error("Error during student signup:", error);
    displayMessage(error.message || "An unexpected error occurred.", "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Sign Up";
  }
}

async function handleLandlordSignup(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  if (!validateEmail(data.email)) {
    displayMessage("Please enter a valid email address.", "error");
    return;
  }
  if (!validatePhone(data.phone)) {
    displayMessage(
      "Please enter a valid Botswana phone number (e.g., +26771234567).",
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

  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = "Registering...";
  displayMessage("Registering your account...", "info");

  try {
    const { user } = await createUserWithEmailAndPassword(
      auth,
      data.email,
      data.password
    );
    await setDoc(doc(db, "users", user.uid), {
      email: data.email,
      username: data.username,
      phone: data.phone,
      role: "landlord",
      createdAt: new Date().toISOString(),
    });
    displayMessage("Landlord account created successfully!", "success");
    form.reset();
    document.getElementById("landlord-signup-modal").style.display = "none";
    window.location.href = "/landlord-dashboard";
  } catch (error) {
    console.error("Error during landlord signup:", error);
    displayMessage(error.message || "An unexpected error occurred.", "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Sign Up";
  }
}

// --- Protect Pages ---
import {
  onAuthStateChanged,
  getAuth,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const protectedPages = [
  "/student-dashboard",
  "/landlord-dashboard",
  "/create-listing",
];
onAuthStateChanged(auth, async (user) => {
  const currentPath = window.location.pathname;
  if (user) {
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) throw new Error("User profile not found");
      const profile = userDoc.data();
      if (currentPath === "/student-dashboard" && profile.role !== "student") {
        window.location.href = "/landlord-dashboard";
      } else if (
        currentPath === "/landlord-dashboard" &&
        profile.role !== "landlord"
      ) {
        window.location.href = "/student-dashboard";
      } else if (
        currentPath === "/create-listing" &&
        profile.role !== "landlord"
      ) {
        window.location.href = "/marketplace";
      }
    } catch (error) {
      console.error("Profile fetch error:", error);
      window.location.href = "/login";
    }
  } else if (protectedPages.includes(currentPath)) {
    window.location.href = "/login";
  }
});

// --- Navigation ---
document.addEventListener("click", (e) => {
  if (e.target.matches("[data-nav]")) {
    e.preventDefault();
    window.location.href = e.target.getAttribute("href");
  }
});

// --- Initial Page Load Logic ---
document.addEventListener("DOMContentLoaded", () => {
  // Add page-specific initializations if needed
});

// Add event listeners to forms
document
  .getElementById("student-signup-form")
  .addEventListener("submit", handleStudentSignup);
document
  .getElementById("landlord-signup-form")
  .addEventListener("submit", handleLandlordSignup);
