// Firebase imports - Only what's needed for auth state, getting user data, and logout
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

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
let currentLandlordSpots = 10; // Default, will be updated by loadLandlordSpots

document.addEventListener("DOMContentLoaded", function () {
  // --- Initialize auth state listener and load landlord spots ---
  initializeAuth();
  loadLandlordSpots();

  // --- MODAL FUNCTIONALITY (Only for modals that are on the landing page) ---
  const modals = document.querySelectorAll(".modal"); // Assumes these modals exist on index.html
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
      btn.removeEventListener("click", openModalHandler); // Remove previous listener
      btn.addEventListener("click", openModalHandler);
    });
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

  
  const headerLoginBtn = document.getElementById("headerLoginBtn");
  const headerSignupBtn = document.getElementById("headerSignupBtn");

  headerLoginBtn.textContent = "Login";
  headerSignupBtn.textContent = "Sign Up";
  

  if (headerLoginBtn) {
    headerLoginBtn.addEventListener("click", function (e) {
      e.preventDefault();
      if (currentUser) {
        
        redirectToDashboard();
      } else {
        // User is not logged in, redirect to login page
        window.location.href = "login.html"; // Redirect to dedicated login page
      }
    });
  }

  if (headerSignupBtn) {
    headerSignupBtn.addEventListener("click", function (e) {
      e.preventDefault();
      if (currentUser) {
      
        handleLogout();
      } else {
      
        window.location.href = "signup.html";
      }
    });
  }

  
  const mobileMenuBtn = document.querySelector(".mobile-menu-btn");
  const navLinks = document.querySelector("header .nav-links");
  if (mobileMenuBtn && navLinks) {
    mobileMenuBtn.addEventListener("click", function () {
      navLinks.classList.toggle("active");
    });
  }


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

  let currentUser = null;
  
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
      // User is signed in - Update header buttons to Dashboard/Logout
      if (headerLoginBtn) {
        headerLoginBtn.textContent = "Dashboard";
      }
      if (headerSignupBtn) {
        headerSignupBtn.textContent = "Logout";
      }
      // No page redirection here. The landing page is always accessible.
    } else {
      // User is signed out - Update header buttons to Login/Sign Up
      if (headerLoginBtn) {
        headerLoginBtn.textContent = "Login";
      }
      if (headerSignupBtn) {
        headerSignupBtn.textContent = "Sign Up";
      }
    }
  }

  
  async function redirectToDashboard() {
    if (!currentUser) {
      
      window.location.href = "login.html"; 
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userType = userData.userType || userData.role || "student"; // Fallback to student

        if (userType === "landlord") {
          window.location.href = "landlord-dashboard.html";
        } else {
          window.location.href = "student-dashboard.html";
        }
      } else {
        // User document not found for an authenticated user (edge case)
        console.warn("User document not found for authenticated user. Redirecting to student dashboard.");
        showMessage("Your user profile could not be loaded. Defaulting to student dashboard.", "error");
        window.location.href = "student-dashboard.html";
      }
    } catch (error) {
      console.error("Error redirecting to dashboard:", error);
      showMessage("Could not determine user role. Redirecting to default.", "error");
      window.location.href = "student-dashboard.html"; // Fallback on error
    }
  }

  // --- LOGOUT FUNCTIONALITY ---
  async function handleLogout() {
    try {
      await signOut(auth);
      showMessage("Successfully logged out!", "success");
      // Redirect back to the landing page to refresh UI
      setTimeout(() => {
          window.location.href = "index.html";
      }, 500);
    } catch (error) {
      console.error("Logout error:", error);
      showMessage("Error logging out. Please try again.", "error");
    }
  }

  // --- WAITLIST FORM SUBMISSION WITH FIREBASE (IF THIS MODAL IS ON LANDING PAGE) ---
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
        await addDoc(collection(db, "waitlist"), data); // addDoc needs to be imported if used

        waitlistForm.style.display = "none";
        waitlistFormSuccessMsg.textContent = "Thank you! You've been added to our waitlist.";
        waitlistFormSuccessMsg.style.display = "block";
        waitlistForm.reset();
      } catch (error) {
        console.error("Waitlist submission error:", error);
        showMessage("There was an error submitting your waitlist request. Please try again.", "error");
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

  // --- LANDLORD SPOTS MANAGEMENT (If visible on landing page) ---
  const landlordSpotsLeftSpan = document.getElementById("landlordsLeft");
  const landlordMembershipCard = document.querySelector(".membership-card.landlord-card");

  async function loadLandlordSpots() {
    try {
      const spotsDocRef = doc(db, "settings", "landlordSpots");
      const spotsDoc = await getDoc(spotsDocRef);

      if (spotsDoc.exists()) {
        currentLandlordSpots = spotsDoc.data().available || 0;
      } else {
         // If spotsDoc doesn't exist, create it with default values (one-time initialization)
         // This assumes 'settings' collection and 'landlordSpots' document might not exist yet
         await setDoc(spotsDocRef, {
            available: 10,
            total: 10,
            lastUpdated: serverTimestamp(),
            createdAt: serverTimestamp()
         });
         currentLandlordSpots = 10; // Set to default after creation
         console.log("Landlord spots document initialized with default values.");
      }

      if (landlordSpotsLeftSpan) {
        landlordSpotsLeftSpan.textContent = currentLandlordSpots;
      }
      updateLandlordSignupButton(currentLandlordSpots);
    } catch (error) {
      console.error("Error loading landlord spots:", error);
      // If error, assume 0 spots to prevent new signups if the count is unknown
      currentLandlordSpots = 0;
      if (landlordSpotsLeftSpan) {
        landlordSpotsLeftSpan.textContent = "N/A";
      }
      updateLandlordSignupButton(currentLandlordSpots);
    }
  }

  function updateLandlordSignupButton(spots) {
    if (!landlordMembershipCard) return;
    const landlordSignupBtn = landlordMembershipCard.querySelector(".btn.open-modal"); // Assuming this is the button that opens a modal

    if (landlordSignupBtn) {
      if (spots <= 0) {
        landlordSignupBtn.textContent = "Join Landlord Waitlist";
        landlordSignupBtn.setAttribute("data-modal", "waitlist-modal"); // Points to waitlist modal on landing page
        landlordSignupBtn.removeEventListener("click", openModalHandler); // Remove generic modal handler
        landlordSignupBtn.removeEventListener("click", landlordWaitlistHandler); // Ensure only one handler
        landlordSignupBtn.addEventListener("click", landlordWaitlistHandler); // Add specific waitlist handler
      } else {
        landlordSignupBtn.textContent = "Become a Landlord";
        landlordSignupBtn.setAttribute("data-modal", "landlord-signup"); // Points to landlord signup modal (if it's on landing page) or directly to signup.html
        landlordSignupBtn.removeEventListener("click", landlordWaitlistHandler); // Remove specific waitlist handler
        landlordSignupBtn.removeEventListener("click", openModalHandler); // Remove previous generic handler
        landlordSignupBtn.addEventListener("click", openModalHandler); // Add generic modal handler back (if modal)
        // IMPORTANT: If "Become a Landlord" button should redirect to signup.html directly,
        // you'd modify its click event or href, not use data-modal for a modal.
        // For this file, I'm assuming it *still* opens a modal on the landing page for signup.
        // If it's meant to redirect, change the `data-modal` attribute logic or its event listener.
      }
    }
  }

  function landlordWaitlistHandler(e) {
    e.preventDefault(); // Prevent default button behavior
    if (waitlistModalTitle) waitlistModalTitle.textContent = "Join Landlord Waitlist";
    if (waitlistModalSubtitle) waitlistModalSubtitle.textContent = "All spots are taken. Join the waitlist to be notified when new spots open!";
    if (waitlistUserTypeSelect) waitlistUserTypeSelect.value = "landlord";
    // Manually open the waitlist modal since `data-modal` attribute is set
    openModal("waitlist-modal");
  }

  async function decreaseLandlordSpots() {
    // Re-fetch current spots to ensure accuracy before decrementing
    try {
        const spotsDocRef = doc(db, "settings", "landlordSpots");
        const spotsDoc = await getDoc(spotsDocRef);

        if (spotsDoc.exists()) {
            let availableSpots = spotsDoc.data().available || 0;
            if (availableSpots > 0) {
                availableSpots--;
                await updateDoc(spotsDocRef, {
                    available: availableSpots,
                    lastUpdated: serverTimestamp() // Update timestamp on change
                });
                currentLandlordSpots = availableSpots; // Update global variable
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
            } else {
                showMessage("No landlord spots available. Please join the waitlist.", "error");
                updateLandlordSignupButton(0); // Ensure button shows waitlist option
            }
        } else {
            console.warn("Landlord spots document not found during decrease. Attempting to initialize.");
            await loadLandlordSpots(); // Attempt to load/initialize and then try decrease again if needed
            showMessage("Error accessing landlord spots. Please try again.", "error");
        }
    } catch (error) {
        console.error("Error decreasing landlord spots:", error);
        showMessage("Failed to update landlord spots. Please contact support.", "error");
    }
  }

  // --- UTILITY FUNCTIONS ---
  // This showMessage is now the primary notification function for the landing page.
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
        border-radius: 8px;
        z-index: 10000;
        font-weight: 500;
        transition: all 0.3s ease;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-family: 'Poppins', Arial, sans-serif;
        display: flex;
        align-items: center;
        gap: 10px;
      `;
      document.body.appendChild(messageEl);
    }

    const iconHtml = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i>`;
    const closeButtonHtml = `
      <button class="notification-close-btn" style="
        background: none;
        border: none;
        font-size: 1.2em;
        cursor: pointer;
        color: inherit;
        margin-left: auto;
        padding: 0;
        line-height: 1;
      ">&times;</button>
    `;

    messageEl.innerHTML = `${iconHtml} <span>${message}</span> ${closeButtonHtml}`;

    if (type === "success") {
      messageEl.style.backgroundColor = "#d4edda";
      messageEl.style.color = "#155724";
      messageEl.style.border = "1px solid #c3e6cb";
    } else if (type === "error") {
      messageEl.style.backgroundColor = "#f8d7da";
      messageEl.style.color = "#721c24";
      messageEl.style.border = "1px solid #f5c6cb";
    }

    messageEl.style.display = "flex";
    messageEl.style.opacity = "1";

    const closeBtn = messageEl.querySelector(".notification-close-btn");
    if (closeBtn) {
      closeBtn.onclick = () => {
        messageEl.style.opacity = "0";
        setTimeout(() => {
          messageEl.style.display = "none";
        }, 300);
      };
    }

    if (messageEl.timeoutId) {
      clearTimeout(messageEl.timeoutId);
    }

    messageEl.timeoutId = setTimeout(() => {
      messageEl.style.opacity = "0";
      setTimeout(() => {
        messageEl.style.display = "none";
      }, 300);
    }, 4000);
  }

  function getFirebaseErrorMessage(error) {
    // This function will probably not be needed in main.js if forms are separate,
    // but keeping it here as a general utility for now.
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
        console.error("Unhandled Firebase Auth error:", error);
        return 'An error occurred. Please try again.';
    }
  }

  // Make functions globally available if needed
  window.openModal = openModal;
  window.closeModal = closeModal;
  window.decreaseLandlordSpots = decreaseLandlordSpots;
  window.handleLogout = handleLogout; // Important for header Logout button
});
