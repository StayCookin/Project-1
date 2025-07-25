import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, addDoc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAXKk5gRjwSGK_g9f_HP_f4y4445e_8l4w",
  authDomain: "project-1-1e31c.firebaseapp.com",
  projectId: "project-1-1e31c",
  storageBucket: "project-1-1e31c.firebasestorage.app",
  messagingSenderId: "658275930203",
  appId: "1:658275930203:web:afc2e2a249509737b0ef7e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Global variables
let currentUser = null;
let currentLandlordSpots = 10;

document.addEventListener("DOMContentLoaded", function () {
  // Initialize auth state listener
  initializeAuth();
  
  // --- MODAL FUNCTIONALITY ---
  const modals = document.querySelectorAll(".modal");
  const openModalButtons = document.querySelectorAll(".open-modal");
  const closeModalButtons = document.querySelectorAll(".modal-close");

  /**
   * Opens a modal by its ID.
   * @param {string} modalId - The ID of the modal to open.
   */
  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add("active");
      document.body.style.overflow = "hidden";
    }
  }

  /**
   * Closes an active modal.
   * @param {HTMLElement} modal - The modal element to close.
   */
  function closeModal(modal) {
    if (modal && modal.classList.contains("active")) {
      modal.classList.remove("active");
      document.body.style.overflow = "";
    }
  }

  // Setup modal open buttons
  function setupOpenModalButtons() {
    document.querySelectorAll(".open-modal").forEach((btn) => {
      btn.removeEventListener("click", openModalHandler);
      btn.addEventListener("click", openModalHandler);
    });
  }

  function openModalHandler(e) {
    e.preventDefault();
    const modalId = this.getAttribute("data-modal");
    if (modalId) {
      document.querySelectorAll(".modal").forEach((m) => m.classList.remove("active"));
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.add("active");
        document.body.style.overflow = "hidden";
      }
    }
  }

  setupOpenModalButtons();

  // Close modal buttons
  closeModalButtons.forEach((btn) => {
    btn.addEventListener("click", function () {
      closeModal(this.closest(".modal"));
    });
  });

  // Close modals on backdrop click
  modals.forEach((modal) => {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) closeModal(modal);
    });
  });

  // Close modals with Escape key
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      modals.forEach((modal) => closeModal(modal));
    }
  });

  // --- HEADER AUTH BUTTONS FUNCTIONALITY ---
  const headerLoginBtn = document.getElementById("headerLoginBtn");
  const headerSignupBtn = document.getElementById("headerSignupBtn");

  if (headerLoginBtn) {
    headerLoginBtn.addEventListener("click", function (e) {
      e.preventDefault();
      if (currentUser) {
        // User is logged in, redirect to appropriate dashboard
        redirectToDashboard();
      } else {
        // User is not logged in, show login modal
        window.location.href= "login.html";
      }
    });
  }
  
  if (headerSignupBtn) {
    headerSignupBtn.addEventListener("click", function (e) {
      e.preventDefault();
      if (currentUser) {
        // User is logged in, handle logout
        handleLogout();
      } else {
        // User is not logged in, show signup modal
        window.location.href="signup.html";
      }
    });
  }

  // --- MOBILE MENU ---
  const mobileMenuBtn = document.querySelector(".mobile-menu-btn");
  const navLinks = document.querySelector("header .nav-links");
  if (mobileMenuBtn && navLinks) {
    mobileMenuBtn.addEventListener("click", function () {
      navLinks.classList.toggle("active");
    });
  }

  // --- SMOOTH SCROLL FOR NAV LINKS ---
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const targetId = this.getAttribute("href").substring(1);
      const target = document.getElementById(targetId);
      if (target) {
        e.preventDefault();
        window.scrollTo({
          top: target.offsetTop - 80,
          behavior: "smooth",
        });
      }
    });
  });

  // --- ANIMATION ON SCROLL ---
  const animatedElements = document.querySelectorAll(".animate");
  function animateOnScroll() {
    animatedElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight - 100) {
        el.classList.add("active");
      }
    });
  }
  window.addEventListener("scroll", animateOnScroll);
  animateOnScroll();

  // --- FIREBASE AUTH INITIALIZATION ---
  function initializeAuth() {
    onAuthStateChanged(auth, async (user) => {
      currentUser = user;
      await updateUIForAuthState(user);
    });
  }

  async function updateUIForAuthState(user) {
    const headerLoginBtn = document.getElementById("headerLoginBtn");
    const headerSignupBtn = document.getElementById("headerSignupBtn");
    
    if (user) {
      // User is signed in - get user type from Firestore
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.exists() ? userDoc.data() : null;
        
        if (headerLoginBtn) {
          headerLoginBtn.textContent = "Dashboard";
        }
        if (headerSignupBtn) {
          headerSignupBtn.textContent = "Logout";
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    } else {
      // User is signed out
      if (headerLoginBtn) {
        headerLoginBtn.textContent = "Login";
      }
      if (headerSignupBtn) {
        headerSignupBtn.textContent = "Sign Up";
      }
    }
  }

  // --- REDIRECT TO APPROPRIATE DASHBOARD ---
  async function redirectToDashboard() {
    if (!currentUser) return;
    
    try {
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userType = userData.userType || userData.role || "student";
        
        if (userType === "landlord") {
          window.location.href = "landlord-dashboard.html";
        } else {
          window.location.href = "student-dashboard.html";
        }
      } else {
        // Default to student dashboard if no user data found
        window.location.href = "student-dashboard.html";
      }
    } catch (error) {
      console.error("Error redirecting to dashboard:", error);
      // Default fallback
      window.location.href = "student-dashboard.html";
    }
  }

  // --- LOGIN FORM SUBMISSION WITH FIREBASE ---
  const studentLoginForm = document.getElementById("studentLoginForm");
  if (studentLoginForm) {
    studentLoginForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const email = document.getElementById("studentLoginEmail").value;
      const password = document.getElementById("studentLoginPassword").value;
      const submitBtn = studentLoginForm.querySelector("button[type='submit']");
      
      if (!email || !password) {
        showMessage("Please enter both email and password.", "error");
        return;
      }
      
      if (submitBtn) submitBtn.disabled = true;
      
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("User signed in:", userCredential.user);
        closeModal(document.getElementById("login"));
        showMessage("Successfully logged in!", "success");
        
        // Redirect to appropriate dashboard after successful login
        setTimeout(() => {
          redirectToDashboard();
        }, 1000);
        
      } catch (error) {
        console.error("Login error:", error);
        showMessage(getFirebaseErrorMessage(error), "error");
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  // --- SIGNUP FORM SUBMISSION WITH FIREBASE ---
  const studentSignupForm = document.getElementById("studentSignupForm");
  if (studentSignupForm) {
    studentSignupForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const name = document.getElementById("studentName").value;
      const email = document.getElementById("studentEmail").value;
      const password = document.getElementById("studentPassword").value;
      const school = document.getElementById("tertiarySchool")?.value || "";
      const studentId = document.getElementById("studentId")?.value || "";
      const phone = document.getElementById("studentPhone")?.value || "";
      const submitBtn = studentSignupForm.querySelector("button[type='submit']");
      
      if (!name || !email || !password) {
        showMessage("Please fill in all required fields.", "error");
        return;
      }
      
      if (submitBtn) submitBtn.disabled = true;
      
      try {
        // Create user account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Store additional user data in Firestore
        await setDoc(doc(db, "users", user.uid), {
          name: name,
          email: email,
          school: school,
          studentId: studentId,
          phone: phone,
          userType: "student",
          createdAt: serverTimestamp(),
          verified: false
        });
        
        console.log("User created:", user);
        closeModal(document.getElementById("student-signup"));
        showMessage("Account created successfully!", "success");
        
        // Redirect to student dashboard after successful signup
        setTimeout(() => {
          window.location.href = "student-dashboard.html";
        }, 1000);
        
      } catch (error) {
        console.error("Signup error:", error);
        showMessage(getFirebaseErrorMessage(error), "error");
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  // --- LANDLORD SIGNUP FORM ---
  const landlordSignupForm = document.getElementById("landlordSignupForm");
  if (landlordSignupForm) {
    landlordSignupForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const name = document.getElementById("landlordName").value;
      const email = document.getElementById("landlordEmail").value;
      const password = document.getElementById("landlordPassword").value;
      const phone = document.getElementById("landlordPhone")?.value || "";
      const company = document.getElementById("landlordCompany")?.value || "";
      const submitBtn = landlordSignupForm.querySelector("button[type='submit']");
      
      if (!name || !email || !password) {
        showMessage("Please fill in all required fields.", "error");
        return;
      }
      
      if (submitBtn) submitBtn.disabled = true;
      
      try {
        // Create user account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Store additional user data in Firestore
        await setDoc(doc(db, "users", user.uid), {
          name: name,
          email: email,
          phone: phone,
          company: company,
          userType: "landlord",
          createdAt: serverTimestamp(),
          verified: false
        });
        
        // Decrease available landlord spots
        await decreaseLandlordSpots();
        
        console.log("Landlord created:", user);
        closeModal(document.getElementById("landlord-signup"));
        showMessage("Landlord account created successfully!", "success");
        
        // Redirect to landlord dashboard after successful signup
        setTimeout(() => {
          window.location.href = "landlord-dashboard.html";
        }, 1000);
        
      } catch (error) {
        console.error("Landlord signup error:", error);
        showMessage(getFirebaseErrorMessage(error), "error");
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  // --- LOGOUT FUNCTIONALITY ---
  async function handleLogout() {
    try {
      await signOut(auth);
      showMessage("Successfully logged out!", "success");
      // Stay on current page after logout
    } catch (error) {
      console.error("Logout error:", error);
      showMessage("Error logging out. Please try again.", "error");
    }
  }

  // --- WAITLIST FORM SUBMISSION WITH FIREBASE ---
  const waitlistForm = document.getElementById("waitlistForm");
  const waitlistFormSuccessMsg = document.getElementById("waitlistFormSuccess");
  const waitlistModalTitle = document.getElementById("waitlistModalTitle");
  const waitlistModalSubtitle = document.getElementById("waitlistModalSubtitle");
  const waitlistUserTypeSelect = document.getElementById("waitlistUserType");

  if (waitlistForm && waitlistFormSuccessMsg) {
    waitlistForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const submitBtn = waitlistForm.querySelector("button[type='submit']");
      if (submitBtn) submitBtn.disabled = true;
      waitlistFormSuccessMsg.textContent = "";

      // Collect form data
      const formData = new FormData(waitlistForm);
      const data = {
        timestamp: serverTimestamp()
      };
      formData.forEach((value, key) => {
        data[key] = value;
      });

      try {
        // Add to Firestore waitlist collection
        await addDoc(collection(db, "waitlist"), data);
        
        waitlistForm.style.display = "none";
        waitlistFormSuccessMsg.textContent = "Thank you! You've been added to our waitlist.";
        waitlistFormSuccessMsg.style.display = "block";
        waitlistForm.reset();
      } catch (error) {
        console.error("Waitlist submission error:", error);
        waitlistFormSuccessMsg.textContent = "There was an error. Please try again.";
        waitlistFormSuccessMsg.style.display = "block";
      } finally {
        if (submitBtn) submitBtn.disabled = false;
        setTimeout(() => {
          const modal = document.getElementById("waitlist-modal");
          if (modal) modal.classList.remove("active");
          document.body.style.overflow = "";
          waitlistForm.style.display = "block";
          waitlistFormSuccessMsg.style.display = "none";
          waitlistForm.reset();
          if (waitlistModalTitle) waitlistModalTitle.textContent = "Join Our Waitlist!";
          if (waitlistModalSubtitle) waitlistModalSubtitle.textContent = "Be the first to know when we launch!";
        }, 3000);
      }
    });
  }

  // --- LANDLORD SPOTS MANAGEMENT ---
  const landlordSpotsLeftSpan = document.getElementById("landlordsLeft");
  const landlordMembershipCard = document.querySelector(".membership-card.landlord-card");

  async function loadLandlordSpots() {
    try {
      const spotsDoc = await getDoc(doc(db, "settings", "landlordSpots"));
      if (spotsDoc.exists()) {
        currentLandlordSpots = spotsDoc.data().available || 0;
      }
      if (landlordSpotsLeftSpan) {
        landlordSpotsLeftSpan.textContent = currentLandlordSpots;
      }
      updateLandlordSignupButton(currentLandlordSpots);
    } catch (error) {
      console.error("Error loading landlord spots:", error);
    }
  }

  function updateLandlordSignupButton(spots) {
    if (!landlordMembershipCard) return;
    const landlordSignupBtn = landlordMembershipCard.querySelector(".btn.open-modal");

    if (landlordSignupBtn) {
      if (spots <= 0) {
        landlordSignupBtn.textContent = "Join Landlord Waitlist";
        landlordSignupBtn.setAttribute("data-modal", "waitlist-modal");
        landlordSignupBtn.removeEventListener("click", landlordWaitlistHandler);
        landlordSignupBtn.addEventListener("click", landlordWaitlistHandler);
      } else {
        landlordSignupBtn.textContent = "Become a Landlord";
        landlordSignupBtn.setAttribute("data-modal", "landlord-signup");
        landlordSignupBtn.removeEventListener("click", landlordWaitlistHandler);
      }
    }
  }

  function landlordWaitlistHandler() {
    if (waitlistModalTitle) waitlistModalTitle.textContent = "Join Landlord Waitlist";  
    if (waitlistModalSubtitle) waitlistModalSubtitle.textContent = "All spots are taken. Join the waitlist to be notified when new spots open!";
    if (waitlistUserTypeSelect) waitlistUserTypeSelect.value = "landlord";
  }

  async function decreaseLandlordSpots() {
    if (currentLandlordSpots > 0) {
      currentLandlordSpots--;
      
      try {
        await updateDoc(doc(db, "settings", "landlordSpots"), {
          available: currentLandlordSpots
        });
        
        if (landlordSpotsLeftSpan) {
          landlordSpotsLeftSpan.textContent = currentLandlordSpots;
        }
        updateLandlordSignupButton(currentLandlordSpots);

        if (currentLandlordSpots === 0) {
          const spotsLeftDiv = landlordMembershipCard?.querySelector(".spots-left");
          if (spotsLeftDiv) {
            spotsLeftDiv.innerHTML = "All spots taken! <br/>Join the waitlist below.";
            spotsLeftDiv.style.color = "var(--primary)";
            spotsLeftDiv.style.backgroundColor = "rgba(34, 139, 34, 0.05)";
          }
        }
      } catch (error) {
        console.error("Error updating landlord spots:", error);
      }
    }
  }

  // --- UTILITY FUNCTIONS ---
  function showMessage(message, type) {
    let messageEl = document.getElementById("globalMessage");
    if (!messageEl) {
      messageEl = document.createElement("div");
      messageEl.id = "globalMessage";
      messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 10000;
        font-weight: 500;
        transition: all 0.3s ease;
        max-width: 400px;
      `;
      document.body.appendChild(messageEl);
    }

    messageEl.textContent = message;
    messageEl.className = type;
    
    if (type === "success") {
      messageEl.style.backgroundColor = "#d4edda";
      messageEl.style.color = "#155724";
      messageEl.style.border = "1px solid #c3e6cb";
    } else if (type === "error") {
      messageEl.style.backgroundColor = "#f8d7da";
      messageEl.style.color = "#721c24";
      messageEl.style.border = "1px solid #f5c6cb";
    }

    messageEl.style.display = "block";
    messageEl.style.opacity = "1";

    setTimeout(() => {
      messageEl.style.opacity = "0";
      setTimeout(() => {
        messageEl.style.display = "none";
      }, 300);
    }, 3000);
  }

  function getFirebaseErrorMessage(error) {
    switch (error.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'Invalid email or password.';
      case 'auth/email-already-in-use':
        return 'This email is already registered.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      default:
        return 'An error occurred. Please try again.';
    }
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // Initialize landlord spots on page load
  loadLandlordSpots();

  // Make functions globally available if needed
  window.openModal = openModal;
  window.closeModal = closeModal;
  window.decreaseLandlordSpots = decreaseLandlordSpots;
});