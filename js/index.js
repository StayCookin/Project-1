// index.js
// JavaScript previously in index.html moved here for modularity and maintainability

document.addEventListener("DOMContentLoaded", function () {
  // --- MODAL FUNCTIONALITY ---
  // Cache all modal elements
  const modals = document.querySelectorAll(".modal");
  // Cache all buttons that open modals
  const openModalButtons = document.querySelectorAll(".open-modal");
  // Cache all buttons that close modals
  const closeModalButtons = document.querySelectorAll(".modal-close");

  /**
   * Opens a modal by its ID.
   * @param {string} modalId - The ID of the modal to open.
   */
  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add("active");
      document.body.style.overflow = "hidden"; // Prevent background scrolling
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

  // Remove duplicate modal open logic and use robust handler for all .open-modal buttons
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
      document
        .querySelectorAll(".modal")
        .forEach((m) => m.classList.remove("active"));
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.add("active");
        document.body.style.overflow = "hidden";
      }
    }
  }
  // Run on DOMContentLoaded and after any dynamic content
  setupOpenModalButtons();
  // If you dynamically add .open-modal buttons elsewhere, call setupOpenModalButtons() again.

  // Add event listeners to all "modal-close" buttons
  closeModalButtons.forEach((btn) => {
    btn.addEventListener("click", function () {
      closeModal(this.closest(".modal"));
    });
  });

  // Add event listener to close modals when clicking on the backdrop
  modals.forEach((modal) => {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) closeModal(modal);
    });
  });

  // Add event listener to close modals with the Escape key
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      modals.forEach((modal) => closeModal(modal));
    }
  });

  // --- HEADER AUTH BUTTONS FUNCTIONALITY ---
  // These buttons open specific modals for login or signup choices.
  const headerLoginBtn = document.getElementById("headerLoginBtn");
  const headerSignupBtn = document.getElementById("headerSignupBtn");

  if (headerLoginBtn) {
    headerLoginBtn.addEventListener("click", function () {
      openModal("login");
    });
  }
  if (headerSignupBtn) {
    headerSignupBtn.addEventListener("click", function () {
      openModal("signup-options");
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

  // --- TESTIMONIAL SLIDER ---
  const testimonialSlider = document.querySelector(".testimonial-slider");
  if (testimonialSlider) {
    // Add your testimonial slider logic here if needed
  }

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

  // --- WAITLIST MODAL FUNCTIONALITY ---
  // The API endpoint for waitlist is now handled by the backend for security. Do not expose Google Apps Script or sensitive API URLs in frontend code.
  // Example: const WAITLIST_API = '/api/waitlist';

  const waitlistForm = document.getElementById("waitlistForm");
  const waitlistFormSuccessMsg = document.getElementById("waitlistFormSuccess");
  const waitlistModalTitle = document.getElementById("waitlistModalTitle");
  const waitlistModalSubtitle = document.getElementById(
    "waitlistModalSubtitle"
  );
  const waitlistUserTypeSelect = document.getElementById("waitlistUserType");

  if (waitlistForm && waitlistFormSuccessMsg) {
    waitlistForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const submitBtn = waitlistForm.querySelector("button[type='submit']");
      if (submitBtn) submitBtn.disabled = true;
      waitlistFormSuccessMsg.textContent = "";

      // Collect form data
      const formData = new FormData(waitlistForm);
      const data = {};
      formData.forEach((value, key) => {
        data[key] = value;
      });

      try {
        const res = await fetch(GOOGLE_SCRIPT_URL, {
          method: "POST",
          mode: "cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const resData = await res.json();
        if (res.ok && resData.result === "success") {
          waitlistForm.style.display = "none";
          waitlistFormSuccessMsg.textContent =
            "Thank you! You've been added to our waitlist.";
          waitlistFormSuccessMsg.style.display = "block";
          waitlistForm.reset();
        } else {
          waitlistFormSuccessMsg.textContent =
            resData.error || "There was an error. Please try again.";
          waitlistFormSuccessMsg.style.display = "block";
        }
      } catch (err) {
        waitlistFormSuccessMsg.textContent =
          "Network error. Please try again later.";
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
          if (waitlistModalTitle)
            waitlistModalTitle.textContent = "Join Our Waitlist!";
          if (waitlistModalSubtitle)
            waitlistModalSubtitle.textContent =
              "Be the first to know about updates, new features, and when we launch.";
        }, 3000);
      }
    });
  }

  // --- LANDLORD SIGNUP TO WAITLIST TRANSITION ---
  const landlordSpotsLeftSpan = document.getElementById("landlordsLeft");
  const landlordMembershipCard = document.querySelector(
    ".membership-card.landlord-card"
  );

  function updateLandlordSignupButton(spots) {
    if (!landlordMembershipCard) return;
    const landlordSignupBtn = landlordMembershipCard.querySelector(
      ".btn.open-modal[data-modal='landlord-signup']"
    );

    if (landlordSignupBtn) {
      if (spots <= 0) {
        landlordSignupBtn.textContent = "Join Landlord Waitlist";
        landlordSignupBtn.setAttribute("data-modal", "waitlist-modal"); // Change modal target

        // Add event listener to pre-fill waitlist form for landlord
        landlordSignupBtn.removeEventListener("click", landlordWaitlistHandler); // Remove previous if any
        landlordSignupBtn.addEventListener("click", landlordWaitlistHandler);
      } else {
        landlordSignupBtn.textContent = "Become a Landlord";
        landlordSignupBtn.setAttribute("data-modal", "landlord-signup");
        landlordSignupBtn.removeEventListener("click", landlordWaitlistHandler);
      }
    }
  }

  // Handler function to customize and open waitlist modal for landlords
  function landlordWaitlistHandler() {
    if (waitlistModalTitle)
      waitlistModalTitle.textContent = "Join Landlord Waitlist";
    if (waitlistModalSubtitle)
      waitlistModalSubtitle.textContent =
        "All free spots are currently taken. Join the waitlist to be notified when new spots open up!";
    if (waitlistUserTypeSelect) waitlistUserTypeSelect.value = "landlord";
    // The generic openModal function will be called due to .open-modal class
  }

  // Simulate updating landlord spots (you'd fetch this from a backend)
  let currentLandlordSpots = 10; // Initial spots
  if (landlordSpotsLeftSpan) {
    landlordSpotsLeftSpan.textContent = currentLandlordSpots;
  }
  updateLandlordSignupButton(currentLandlordSpots);

  // Example: Simulate spots decreasing (e.g., after a new landlord signs up successfully)
  // You would call this function when a landlord successfully signs up elsewhere in your code
  function decreaseLandlordSpots() {
    if (currentLandlordSpots > 0) {
      currentLandlordSpots--;
      if (landlordSpotsLeftSpan) {
        landlordSpotsLeftSpan.textContent = currentLandlordSpots;
      }
      updateLandlordSignupButton(currentLandlordSpots);

      if (currentLandlordSpots === 0) {
        const spotsLeftDiv = landlordMembershipCard
          ? landlordMembershipCard.querySelector(".spots-left")
          : null;
        if (spotsLeftDiv) {
          spotsLeftDiv.innerHTML =
            "All free spots are currently taken! <br/>Join the waitlist below.";
          spotsLeftDiv.style.color = "var(--primary)"; // Change color to less urgent
          spotsLeftDiv.style.backgroundColor = "rgba(34, 139, 34, 0.05)";
        }
      }
    }
  }

  // --- REVIEW MODAL FORM SUBMISSION ---
  // The API endpoint for reviews is now handled by the backend proxy. Do not expose direct backend URLs in frontend code.
  // Example: const REVIEWS_API = '/api/reviews';

  const reviewModalForm = document.getElementById("reviewForm");
  if (reviewModalForm) {
    reviewModalForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      // Example: get propertyId and userId from context or form
      const studentData = JSON.parse(localStorage.getItem("studentData"));
      const reviewText = document.getElementById("reviewText")?.value || "";
      const rating = document.getElementById("selectedRating")?.value || 0;
      const propertyId = window.currentPropertyId || 1; // Replace with real propertyId
      const userId = studentData?.id || 1; // Replace with real userId
      const payload = { propertyId, userId, review: reviewText, rating };
      try {
        const res = await fetch("http://localhost:5001/api/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.ok) {
          document.getElementById("reviewFormSuccess").textContent =
            "Thank you for your review!";
          reviewModalForm.reset();
        } else {
          document.getElementById("reviewFormSuccess").textContent =
            data.error || "Failed to submit review.";
        }
      } catch (err) {
        document.getElementById("reviewFormSuccess").textContent =
          "Network error. Please try again.";
      }
    });
  }

  // --- LOGIN MODAL: SIGN UP LINK ---
  document
    .querySelectorAll('.switch-to-signup[data-modal="student-signup"]')
    .forEach((link) => {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        const modal = document.getElementById("login");
        if (modal) modal.classList.remove("active");
        setTimeout(() => {
          const signupModal = document.getElementById("student-signup");
          if (signupModal) signupModal.classList.add("active");
        }, 200);
      });
    });

  // --- Ensure openModal and closeModal functions are defined before this script runs ---
  // (They are already in your provided script, just ensure correct order)

  // Make sure to also modify the `openModalButtons.forEach` event listener
  // to correctly handle the dynamically changing `data-modal` attribute
  // if you change it for the landlord button. The existing one should be fine,
  // but it's good to be aware. The crucial part is that the generic `openModal(modalId)`
  // function is called by the `open-modal` class logic.

  // Modify the existing openModalButtons loop to ensure it re-evaluates data-modal on click for the landlord button specifically,
  // or ensure the landlordWaitlistHandler also explicitly calls openModal if the generic listener doesn't pick up dynamic changes well.
  // However, the existing generic modal opener should work fine as it reads `data-modal` on click.

  // When a landlord successfully signs up (in your #landlord-signup modal's submit handler):
  // After `alert("Landlord account created successfully (simulation)!");`
  // you would call `decreaseLandlordSpots();`
  // Example:
  /*
    if (landlordSignupForm) {
      landlordSignupForm.addEventListener("submit", function (e) {
        e.preventDefault();
        // ... your existing landlord signup logic ...
        if (otp.length === 6) { // Assuming successful verification
          console.log("Landlord signup submitted with OTP:", otp);
          alert("Landlord account created successfully (simulation)!");
          closeModal(document.getElementById("landlord-signup"));
          openModal("landlord-dashboard");
          initializeCharts();
          decreaseLandlordSpots(); // Call this after successful signup
        }
      });
    }
  */
  // You'll need to integrate the `decreaseLandlordSpots()` call into the *actual* successful landlord signup logic.
  // For simulation, you can test it by calling it from the console or a temporary button.

  // Call to initialize landlord button state on page load
  if (landlordSpotsLeftSpan) {
    // Check if the element exists
    let initialSpots = parseInt(landlordSpotsLeftSpan.textContent) || 0; // Get initial spots from HTML or default
    currentLandlordSpots = initialSpots; // Sync with current spots
    updateLandlordSignupButton(currentLandlordSpots);
  }
});
