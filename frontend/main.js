// Main application JavaScript

// DOM Elements
const addListingBtn = document.getElementById("addListingBtn");
const addListingModal = document.getElementById("add-listing-modal");
const documentUploads = document.querySelectorAll(".document-upload");
const amenityInput = document.getElementById("amenityInput");
const conditionRating = document.getElementById("conditionRating");
const safetyRating = document.getElementById("safetyRating");
const writeReviewBtn = document.getElementById("writeReviewBtn");
const reviewModal = document.getElementById("review-modal");
const ratingStars = document.querySelectorAll("#ratingStars i");
const landlordNextBtn = document;

// State
let selectedRating = 0;

// --- API ENDPOINTS ---
const API_BASE = "/api";

// Initialize
function initialize() {
  // Add listing form submission
  if (document.getElementById("addListingForm")) {
    document
      .getElementById("addListingForm")
      .addEventListener("submit", handleListingSubmit);
  }

  // Waitlist form submission
  if (document.getElementById("waitlistForm")) {
    document
      .getElementById("waitlistForm")
      .addEventListener("submit", handleWaitlistSubmit);
  }

  // Review modal handlers
  if (writeReviewBtn) {
    writeReviewBtn.addEventListener("click", openReviewModal);
  }
  if (reviewModal) {
    ratingStars.forEach((star) => {
      star.addEventListener("click", handleStarClick);
      star.addEventListener("mouseover", handleStarHover);
      star.addEventListener("mouseout", handleStarHoverOut);
    });
    reviewModal
      .querySelector("form")
      .addEventListener("submit", handleReviewSubmit);
  }

  // Photo uploads
  const photoUploadItems = document.querySelectorAll(".photo-upload-item");
  photoUploadItems.forEach((item) => {
    const input = item.querySelector('input[type="file"]');
    const placeholder = item.querySelector(".photo-upload-placeholder");

    item.addEventListener("click", () => input.click());
    input.addEventListener("change", handlePhotoUpload);
  });

  // Remove loading reviews from localStorage in initialize()
  // const existingReviews =
  //   JSON.parse(localStorage.getItem("landlordReviews")) || [];
  // existingReviews.forEach((review) => addReviewToList(review));
  // updateAverageRating();
  // Instead, fetch reviews from backend if needed
}

// Waitlist form handler
async function handleWaitlistSubmit(e) {
  e.preventDefault();
  const messageDiv = document.querySelector(".waitlist-message");

  try {
    const formData = {
      firstName: document.getElementById("firstName").value,
      lastName: document.getElementById("lastName").value,
      email: document.getElementById("email").value,
      phone: document.getElementById("phone").value,
      university: document.getElementById("university").value,
      role: document.getElementById("role").value,
      interest: document.getElementById("interest").value,
    };

    const res = await fetch(`${API_BASE}/waitlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    if (!res.ok) throw new Error("Failed to join waitlist");

    messageDiv.classList.remove("error");
    messageDiv.classList.add("success");
    messageDiv.textContent = "Thank you for joining the waitlist!";
    messageDiv.style.display = "block";

    // Clear the form
    e.target.reset();
  } catch (error) {
    console.error("Error submitting waitlist form:", error);
    messageDiv.classList.remove("success");
    messageDiv.classList.add("error");
    messageDiv.textContent = "An error occurred. Please try again.";
    messageDiv.style.display = "block";
  }
}

// Functions
async function handleListingSubmit(e) {
  e.preventDefault();

  // Validate photos
  const uploadedPhotos = Array.from(photoUploadItems).filter(
    (item) => item.querySelector('input[type="file"]').files.length > 0
  );

  if (uploadedPhotos.length < 3) {
    alert("Please upload at least 3 photos of your property");
    return;
  }

  // Validate documents
  const uploads = Array.from(documentUploads).every(
    (upload) => upload.querySelector('input[type="file"]').files.length > 0
  );

  if (!uploads) {
    alert("Please upload all required documents");
    return;
  }

  // Gather form data
  const form = e.target;
  const formData = new FormData(form);

  // Add amenities
  const amenities = Array.from(amenitiesList.children).map((tag) =>
    tag.textContent.trim()
  );
  formData.append("amenities", JSON.stringify(amenities));

  try {
    const res = await fetch(`${API_BASE}/properties`, {
      method: "POST",
      body: formData,
      // credentials: 'include' // if using cookies for auth
    });
    if (!res.ok) throw new Error("Failed to submit listing");
    alert("Your listing has been submitted for verification.");
    addListingModal.classList.remove("active");
    form.reset();
    if (amenitiesList) amenitiesList.innerHTML = "";
    if (photoPreviewContainer) photoPreviewContainer.innerHTML = "";
    if (photoUploadGridInput) photoUploadGridInput.value = "";
    document.querySelectorAll(".upload-preview").forEach((p) => {
      p.classList.remove("active");
      if (p.querySelector(".filename"))
        p.querySelector(".filename").textContent = "";
    });
    document
      .querySelectorAll(".document-upload p")
      .forEach((p) => (p.style.display = "block"));
    if (conditionValue)
      conditionValue.textContent = conditionRating.value = "7";
    if (safetyValue) safetyValue.textContent = safetyRating.value = "7";
    displayProperties();
  } catch (err) {
    alert("Failed to submit listing. Please try again.");
    console.error(err);
  }
}

function handlePhotoUpload(e) {
  const file = e.target.files[0];

  if (file.size > 5 * 1024 * 1024) {
    alert("File size must be less than 5MB");
    e.target.value = "";
    return;
  }

  if (!file.type.startsWith("image/")) {
    alert("Please upload only image files");
    e.target.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const img = document.createElement("img");
    img.src = e.target.result;
    e.target.parentElement.appendChild(img);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "photo-delete";
    deleteBtn.innerHTML = "×";
    deleteBtn.onclick = function (e) {
      e.stopPropagation();
      e.target.parentElement.querySelector('input[type="file"]').value = "";
      img.remove();
      deleteBtn.remove();
      e.target.parentElement
        .querySelector(".photo-upload-placeholder")
        .classList.remove("hidden");
    };
    e.target.parentElement.appendChild(deleteBtn);

    e.target.parentElement
      .querySelector(".photo-upload-placeholder")
      .classList.add("hidden");
  };
  reader.readAsDataURL(file);
}

function openReviewModal() {
  const studentData = JSON.parse(localStorage.getItem("studentData"));
  if (!studentData || !studentData.verified) {
    alert("Please log in as a student to write a review.");
    return;
  }
  reviewModal.classList.add("active");
}

async function handleReviewSubmit(e) {
  e.preventDefault();

  if (selectedRating === 0) {
    alert("Please select a rating");
    return;
  }

  const reviewText = e.target.querySelector("textarea").value;
  if (!currentUser || !currentUser.verified) {
    alert("Please log in as a student to write a review.");
    return;
  }
  const propertyId = e.target.dataset.propertyId;
  try {
    const res = await fetch(`${API_BASE}/reviews/${propertyId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: selectedRating, text: reviewText }),
      credentials: 'include'
    });
    if (!res.ok) throw new Error("Failed to submit review");
    alert("Thank you for your review!");
    reviewModal.classList.remove("active");
    e.target.reset();
    selectedRating = 0;
    updateStars(0);
  } catch (err) {
    alert("Failed to submit review. Please try again.");
    console.error(err);
  }
}

function handleStarHover() {
  const index = Array.from(ratingStars).indexOf(this);
  updateStars(index + 1);
}

function handleStarHoverOut() {
  updateStars(selectedRating);
}

function handleStarClick() {
  const index = Array.from(ratingStars).indexOf(this);
  selectedRating = index + 1;
  updateStars(selectedRating);
}

function updateStars(rating) {
  ratingStars.forEach((star, index) => {
    star.classList.toggle("fas", index < rating);
    star.classList.toggle("far", index >= rating);
  });
}

function addReviewToList(review) {
  const reviewList = document.querySelector(".reviews-section .review-list");
  if (!reviewList) return;

  const reviewCard = document.createElement("div");
  reviewCard.className = "review-card";
  reviewCard.innerHTML = `
        <div class="review-header">
            <div class="reviewer-info">
                <div class="reviewer-avatar">${review.reviewer.name[0]}</div>
                <div class="reviewer-name">${review.reviewer.name}</div>
            </div>
            <div class="review-date">${new Date(
              review.timestamp
            ).toLocaleDateString()}</div>
        </div>
        <div class="review-rating">${createStarRatingHTML(review.rating)}</div>
        <div class="review-content">${review.text}</div>
    `;

  reviewList.appendChild(reviewCard);
}

function createStarRatingHTML(rating) {
  return Array(5)
    .fill()
    .map((_, i) =>
      i < rating ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>'
    )
    .join("");
}

// Remove updateAverageRating() and any code that uses landlordReviews from localStorage
function updateAverageRating() {
  // Fetch reviews from backend and calculate average
  // Example:
  fetch(`${API_BASE}/reviews/landlord`)
    .then((res) => res.json())
    .then((reviews) => {
      if (!Array.isArray(reviews) || reviews.length === 0) return;
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = (totalRating / reviews.length).toFixed(1);
      const ratingValue = document.querySelector(".landlord-rating .rating-value");
      const reviewCount = document.querySelector(".landlord-rating .review-count");
      if (ratingValue && reviewCount) {
        ratingValue.textContent = averageRating;
        reviewCount.textContent = `(${reviews.length} review${
          reviews.length === 1 ? "" : "s"
        })`;
      }
    });
}

document.addEventListener("DOMContentLoaded", initialize);

// Waitlist form functionality
const universitySelect = document.getElementById("university");
const otherUniversityDiv = document.getElementById("otherUniversity");
const otherUniversityInput = document.getElementById("otherUniversityName");

// Show/hide other university input based on selection
universitySelect.addEventListener("change", function () {
  if (this.value === "other") {
    otherUniversityDiv.style.display = "block";
    otherUniversityInput.required = true;
  } else {
    otherUniversityDiv.style.display = "none";
    otherUniversityInput.required = false;
    otherUniversityInput.value = "";
  }
});

// Load existing reviews on page load
// const existingReviews =
//   JSON.parse(localStorage.getItem("landlordReviews")) || [];
// existingReviews.forEach((review) => addReviewToList(review));
// updateAverageRating();
// MAIN SCRIPT FILE (main.js)
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
    } else {
      console.warn(`Modal with ID "${modalId}" not found.`);
    }
  }

  /**
   * Closes an active modal.
   * @param {HTMLElement} modal - The modal element to close.
   */
  function closeModal(modal) {
    if (modal && modal.classList.contains("active")) {
      // Check if modal is active before trying to close
      modal.classList.remove("active");
      // Restore scroll only if no other modals are active
      const anyActiveModal =
        Array.from(document.querySelectorAll(".modal.active")).length > 0;
      if (!anyActiveModal) {
        document.body.style.overflow = "auto";
      }
    }
  }

  // Add event listeners to all "open-modal" buttons
  openModalButtons.forEach((button) => {
    button.addEventListener("click", function (e) {
      e.preventDefault();
      const modalId = this.getAttribute("data-modal");
      const parentModal = this.closest(".modal"); // Check if button is inside another modal

      // If inside an active modal, close it first before opening the new one
      if (parentModal && parentModal.classList.contains("active")) {
        closeModal(parentModal);
      }
      openModal(modalId);
    });
  });

  // Add event listeners to all "modal-close" buttons
  closeModalButtons.forEach((btn) => {
    btn.addEventListener("click", function () {
      closeModal(this.closest(".modal"));
    });
  });

  // Add event listener to close modals when clicking on the backdrop
  modals.forEach((modal) => {
    modal.addEventListener("click", function (e) {
      if (e.target === this) {
        // Check if the click is on the backdrop itself
        closeModal(this);
      }
    });
  });

  // Add event listener to close modals with the Escape key
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      const activeModals = document.querySelectorAll(".modal.active");
      if (activeModals.length > 0) {
        closeModal(activeModals[activeModals.length - 1]); // Close the top-most active modal
      }
    }
  });

  // --- HEADER AUTH BUTTONS FUNCTIONALITY ---
  // These buttons open specific modals for login or signup choices.
  const headerLoginBtn = document.getElementById("headerLoginBtn");
  const headerSignupBtn = document.getElementById("headerSignupBtn");

  if (headerLoginBtn) {
    // The Login button in the header opens the #login modal.
    // This modal contains tabs to switch between student and landlord login forms.
    headerLoginBtn.addEventListener("click", () => openModal("login"));
  }
  if (headerSignupBtn) {
    // The Sign Up button in the header opens the #signup-options modal.
    // This modal allows the user to choose between student or landlord signup,
    // leading to separate, dedicated signup modals (#student-signup or #landlord-signup).
    headerSignupBtn.addEventListener("click", () =>
      openModal("signup-options")
    );
  }

  // --- MOBILE MENU ---
  const mobileMenuBtn = document.querySelector(".mobile-menu-btn");
  const navLinks = document.querySelector("header .nav-links");
  if (mobileMenuBtn && navLinks) {
    mobileMenuBtn.addEventListener("click", function () {
      navLinks.classList.toggle("active");
      const icon = mobileMenuBtn.querySelector("i");
      if (icon) {
        icon.classList.toggle("fa-bars");
        icon.classList.toggle("fa-times");
      }
    });
    navLinks.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        if (navLinks.classList.contains("active")) {
          navLinks.classList.remove("active");
          const icon = mobileMenuBtn.querySelector("i");
          if (icon) {
            icon.classList.remove("fa-times");
            icon.classList.add("fa-bars");
          }
        }
      });
    });
  }

  // --- SMOOTH SCROLL FOR NAV LINKS ---
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const hrefAttribute = this.getAttribute("href");
      if (hrefAttribute && hrefAttribute.length > 1) {
        const targetElement = document.querySelector(hrefAttribute);
        if (targetElement) {
          e.preventDefault();
          targetElement.scrollIntoView({ behavior: "smooth" });
        }
      }
    });
  });

  // --- TESTIMONIAL SLIDER ---
  const testimonialSlider = document.querySelector(".testimonial-slider");
  if (testimonialSlider) {
    const testimonials = testimonialSlider.querySelectorAll(".testimonial");
    const dots = document.querySelectorAll(
      ".testimonial-controls .control-dot"
    );
    const prevBtn = document.getElementById("prevTestimonial");
    const nextBtn = document.getElementById("nextTestimonial");
    let currentSlide = 0;
    let testimonialInterval;

    function showSlide(index) {
      if (testimonials.length === 0) return;
      testimonials.forEach((testimonial, i) => {
        testimonial.classList.remove("active", "prev");
        if (i === index) {
          testimonial.classList.add("active");
        } else if (
          i === (index - 1 + testimonials.length) % testimonials.length &&
          testimonials.length > 1
        ) {
          testimonial.classList.add("prev");
        }
      });
      if (dots.length > 0 && dots[index]) {
        dots.forEach((dot) => dot.classList.remove("active"));
        dots[index].classList.add("active");
      }
    }

    function nextSlide() {
      if (testimonials.length === 0) return;
      currentSlide = (currentSlide + 1) % testimonials.length;
      showSlide(currentSlide);
    }

    function prevSlide() {
      if (testimonials.length === 0) return;
      currentSlide =
        (currentSlide - 1 + testimonials.length) % testimonials.length;
      showSlide(currentSlide);
    }

    function startTestimonialInterval() {
      if (testimonials.length > 1) {
        testimonialInterval = setInterval(nextSlide, 7000);
      }
    }
    function resetTestimonialInterval() {
      clearInterval(testimonialInterval);
      startTestimonialInterval();
    }

    if (nextBtn)
      nextBtn.addEventListener("click", () => {
        nextSlide();
        resetTestimonialInterval();
      });
    if (prevBtn)
      prevBtn.addEventListener("click", () => {
        prevSlide();
        resetTestimonialInterval();
      });

    dots.forEach((dot, index) => {
      dot.addEventListener("click", () => {
        currentSlide = index;
        showSlide(currentSlide);
        resetTestimonialInterval();
      });
    });

    if (testimonials.length > 0) {
      showSlide(currentSlide);
      startTestimonialInterval();
    }
  }

  // --- ANIMATION ON SCROLL ---
  const animatedElements = document.querySelectorAll(".animate");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("active");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  animatedElements.forEach((el) => observer.observe(el));

  // --- BACK TO TOP BUTTON ---
  const backToTopButton = document.querySelector(".back-to-top");
  if (backToTopButton) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 300) {
        backToTopButton.classList.add("active");
      } else {
        backToTopButton.classList.remove("active");
      }
    });
    backToTopButton.addEventListener("click", (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // --- CURRENT YEAR FOR FOOTER ---
  const currentYearSpan = document.getElementById("currentYear");
  if (currentYearSpan) {
    currentYearSpan.textContent = new Date().getFullYear();
  }

  // --- NEWSLETTER SUBSCRIPTION ---
  const subscribeBtn = document.getElementById("subscribeBtn");
  const newsletterEmailInput = document.getElementById("newsletterEmail");
  const newsletterSuccessMsg = document.getElementById("newsletterSuccess");

  if (subscribeBtn && newsletterEmailInput && newsletterSuccessMsg) {
    subscribeBtn.addEventListener("click", function () {
      const email = newsletterEmailInput.value.trim();
      if (email && email.includes("@")) {
        newsletterSuccessMsg.textContent = "Thank you for subscribing!";
        newsletterSuccessMsg.style.color = "var(--primary)";
        newsletterSuccessMsg.style.display = "block";
        newsletterEmailInput.value = "";
        setTimeout(() => {
          newsletterSuccessMsg.style.display = "none";
        }, 3000);
      } else {
        newsletterSuccessMsg.textContent = "Please enter a valid email.";
        newsletterSuccessMsg.style.color = "red";
        newsletterSuccessMsg.style.display = "block";
        setTimeout(() => {
          newsletterSuccessMsg.style.display = "none";
        }, 3000);
      }
    });
  }

  // --- CONTACT FORM SUBMISSION ---
  const mainContactForm = document.getElementById("mainContactForm");
  const contactFormSuccessMsg = document.getElementById("contactFormSuccess");
  if (mainContactForm && contactFormSuccessMsg) {
    mainContactForm.addEventListener("submit", function (e) {
      e.preventDefault();
      contactFormSuccessMsg.textContent =
        "Message sent successfully! We'll get back to you soon.";
      contactFormSuccessMsg.style.display = "block";
      mainContactForm.reset();
      setTimeout(() => {
        contactFormSuccessMsg.style.display = "none";
        closeModal(document.getElementById("contact-form-modal"));
      }, 3000);
    });
  }

  // --- LOGIN FORM SWITCHING (STUDENT/LANDLORD) ---
  // This handles the tabs within the #login modal to show either student or landlord login form.
  const loginOptionBtns = document.querySelectorAll("#login .login-option-btn");
  const loginForms = document.querySelectorAll("#login .login-form");

  loginOptionBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      loginOptionBtns.forEach((b) => b.classList.remove("active"));
      this.classList.add("active");

      const formIdToShow = this.getAttribute("data-form");
      loginForms.forEach((form) => {
        form.style.display = form.id === formIdToShow ? "block" : "none";
      });
    });
  });

  // --- STUDENT LOGIN FORM SUBMISSION (API) ---
  const studentLoginForm = document.getElementById("studentLoginForm");
  if (studentLoginForm) {
    studentLoginForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const email = document.getElementById("studentLoginEmail").value.trim();
      const password = document.getElementById("studentLoginPassword").value;
      if (!email || !password) {
        alert("Please enter your email and password.");
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, role: "student" }),
          credentials: 'include'
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Login failed");
        await fetchCurrentUser();
        alert("Student login successful!");
        closeModal(document.getElementById("login"));
        openModal("property-listings");
        displayProperties();
      } catch (err) {
        alert(err.message || "Login failed. Please try again.");
      }
    });
  }

  // --- LANDLORD LOGIN FORM SUBMISSION (API) ---
  const landlordLoginForm = document.getElementById("landlordLoginForm");
  if (landlordLoginForm) {
    landlordLoginForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const email = document.getElementById("landlordLoginEmail").value.trim();
      const password = document.getElementById("landlordLoginPassword").value;
      if (!email || !password) {
        alert("Please enter your email and password.");
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, role: "landlord" }),
          credentials: 'include'
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Login failed");
        localStorage.setItem("landlordToken", data.token);
        alert("Landlord login successful!");
        closeModal(document.getElementById("login"));
        openModal("landlord-dashboard");
        initializeCharts();
      } catch (err) {
        alert(err.message || "Login failed. Please try again.");
      }
    });
  }

  // --- STUDENT SIGNUP FLOW (API) ---
  if (
    studentSignupForm &&
    studentNextBtn &&
    studentSignupStep1 &&
    studentVerificationStep
  ) {
    studentNextBtn.addEventListener("click", async function () {
      const name = document.getElementById("studentName").value.trim();
      const email = document.getElementById("studentEmail").value.trim();
      const password = document.getElementById("studentPassword").value;
      const school = document.getElementById("tertiarySchool").value;
      const studentIdVal = document.getElementById("studentId").value.trim();
      const phone = document.getElementById("studentPhone").value.trim();

      if (!name || !email || !password || !school || !studentIdVal || !phone) {
        alert("Please fill in all required fields for student signup.");
        return;
      }
      if (!email.includes("@")) {
        alert("Please enter a valid student email address.");
        return;
      }
      if (!phone.match(/^[72][0-9]{7}$/)) {
        alert(
          "Please enter a valid 8-digit Botswana mobile number (starting with 7 or 2)."
        );
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            password,
            school,
            studentId: studentIdVal,
            phone,
            role: "student",
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Signup failed");
        if (studentVerificationEmailDisplay)
          studentVerificationEmailDisplay.textContent = email;
        studentSignupStep1.classList.remove("active");
        studentVerificationStep.classList.add("active");
        setupVerificationInputs("#studentVerificationStep .verification-code");
        startOtpTimer("studentTimer", "studentResendCode");
      } catch (err) {
        alert(err.message || "Signup failed. Please try again.");
      }
    });

    studentSignupForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const otpInputs = studentVerificationStep.querySelectorAll(
        ".verification-code input"
      );
      const otp = Array.from(otpInputs)
        .map((input) => input.value)
        .join("");
      if (otp.length !== 6) {
        alert("Please enter the complete 6-digit verification code.");
        return;
      }
      const email = document.getElementById("studentEmail").value.trim();
      try {
        const res = await fetch(`${API_BASE}/auth/verify-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Verification failed");
        alert("Student account created successfully! Please proceed to payment.");
        closeModal(document.getElementById("student-signup"));
        openModal("payment-modal");
      } catch (err) {
        alert(err.message || "Verification failed. Please try again.");
      }
    });

    if (studentResendCodeBtn) {
      studentResendCodeBtn.addEventListener("click", async () => {
        const email = document.getElementById("studentEmail").value.trim();
        if (!email) {
          alert("Please enter your email first.");
          return;
        }
        try {
          const res = await fetch(`${API_BASE}/auth/resend-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || "Failed to resend code");
          alert("Verification code resent!");
          startOtpTimer("studentTimer", "studentResendCode");
        } catch (err) {
          alert(err.message || "Failed to resend code. Please try again.");
        }
      });
    }
  }

  // --- LANDLORD SIGNUP FLOW (API) ---
  if (
    landlordSignupForm &&
    landlordNextBtn &&
    landlordSignupStep1 &&
    landlordVerificationStep
  ) {
    landlordNextBtn.addEventListener("click", async function () {
      const fullName = document.getElementById("landlordFullName").value.trim();
      const email = document.getElementById("landlordEmail").value.trim();
      const phone = document.getElementById("landlordPhone").value.trim();
      const password = landlordPasswordInput.value;
      const confirmPassword = landlordConfirmPasswordInput.value;
      if (!fullName || !email || !phone || !password || !confirmPassword) {
        alert("Please fill all required fields for landlord signup.");
        return;
      }
      if (password !== confirmPassword) {
        alert("Passwords do not match.");
        return;
      }
      if (!phone.match(/^[72][0-9]{7}$/)) {
        alert(
          "Please enter a valid 8-digit Botswana mobile number (starting with 7 or 2)."
        );
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: fullName,
            email,
            password,
            phone,
            role: "landlord",
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Signup failed");
        const verificationMethod = landlordSignupForm.querySelector(
          'input[name="landlordVerificationMethod"]:checked'
        ).value;
        const target = verificationMethod === "email" ? email : phone;
        if (landlordVerificationText)
          landlordVerificationText.innerHTML = `We've sent a verification code to <strong>${target}</strong>. Please enter it below:`;
        landlordSignupStep1.classList.remove("active");
        landlordVerificationStep.classList.add("active");
        setupVerificationInputs("#landlordVerificationCodeInputs");
        startOtpTimer("landlordTimer", "landlordResendCode");
      } catch (err) {
        alert(err.message || "Signup failed. Please try again.");
      }
    });

    landlordSignupForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const otpInputs = landlordVerificationStep.querySelectorAll(
        ".verification-code input"
      );
      const otp = Array.from(otpInputs)
        .map((input) => input.value)
        .join("");
      if (otp.length !== 6) {
        alert("Please enter the complete 6-digit verification code.");
        return;
      }
      const email = document.getElementById("landlordEmail").value.trim();
      try {
        const res = await fetch(`${API_BASE}/auth/verify-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Verification failed");
        alert("Landlord account created successfully!");
        closeModal(document.getElementById("landlord-signup"));
        openModal("landlord-dashboard");
        initializeCharts();
      } catch (err) {
        alert(err.message || "Verification failed. Please try again.");
      }
    });

    if (landlordResendCodeBtn) {
      landlordResendCodeBtn.addEventListener("click", async () => {
        const email = document.getElementById("landlordEmail").value.trim();
        if (!email) {
          alert("Please enter your email first.");
          return;
        }
        try {
          const res = await fetch(`${API_BASE}/auth/resend-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || "Failed to resend code");
          alert("Verification code resent!");
          startOtpTimer("landlordTimer", "landlordResendCode");
        } catch (err) {
          alert(err.message || "Failed to resend code. Please try again.");
        }
      });
    }
  }

  // --- PAYMENT FORM HANDLING ---
  const paymentForm = document.getElementById("payment-form");
  if (paymentForm) {
    paymentForm.addEventListener("submit", function (e) {
      e.preventDefault();
      console.log("Processing payment...");
      alert("Payment successful (simulation)! Welcome to InRent.");
      closeModal(document.getElementById("payment-modal"));
      openModal("welcome-message");
    });
    const cardNumberInput = document.getElementById("card-number");
    if (cardNumberInput) {
      cardNumberInput.addEventListener("input",
          alert(
            `Please ensure your ${verificationMethod} is entered in the previous step.`
          );
          return;
        }
        try {
          const res = await fetch(`${API_BASE}/auth/resend-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: verificationMethod === "email" ? target : undefined,
              phone: verificationMethod === "phone" ? target : undefined,
              verificationMethod,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || "Failed to resend code");
          alert("Verification code resent!");
          startOtpTimer("landlordTimer", "landlordResendCode");
        } catch (err) {
          alert(err.message || "Failed to resend code. Please try again.");
        }
      });
    }
  }

  // --- PAYMENT FORM HANDLING ---
  const paymentForm = document.getElementById("payment-form");
  if (paymentForm) {
    paymentForm.addEventListener("submit", function (e) {
      e.preventDefault();
      console.log("Processing payment...");
      alert("Payment successful (simulation)! Welcome to InRent.");
      closeModal(document.getElementById("payment-modal"));
      openModal("welcome-message");
    });
    const cardNumberInput = document.getElementById("card-number");
    if (cardNumberInput) {
      cardNumberInput.addEventListener("input", function (e) {
        let value = e.target.value.replace(/\D/g, "");
        value = value.replace(/(.{4})/g, "$1 ").trim();
        e.target.value = value.substring(0, 19);
      });
    }
    const cardExpiryInput = document.getElementById("card-expiry");
    if (cardExpiryInput) {
      cardExpiryInput.addEventListener("input", function (e) {
        let value = e.target.value.replace(/\D/g, "");
        if (value.length > 2 && value.indexOf("/") === -1) {
          value = value.substring(0, 2) + "/" + value.substring(2, 4);
        } else if (
          value.length === 2 &&
          e.inputType !== "deleteContentBackward" &&
          value.indexOf("/") === -1
        ) {
          value = value + "/";
        }
        e.target.value = value.substring(0, 5);
      });
    }
    const cardCvvInput = document.getElementById("card-cvv");
    if (cardCvvInput) {
      cardCvvInput.addEventListener("input", (e) => {
        e.target.value = e.target.value.replace(/\D/g, "").substring(0, 4);
      });
    }
  }

  // --- VIEW LISTINGS BUTTON FROM WELCOME MESSAGE ---
  const viewListingsBtnWelcome = document.getElementById(
    "viewListingsBtnWelcome"
  );
  if (viewListingsBtnWelcome) {
    viewListingsBtnWelcome.addEventListener("click", function () {
      closeModal(document.getElementById("welcome-message"));
      openModal("property-listings");
      displayProperties();
    });
  }

  // --- PROPERTY LISTINGS & FILTERING (SAMPLE DATA) ---
  const sampleProperties = [
    {
      id: 1,
      title: "Modern 2-Bed near UB",
      price: 3500,
      location: "Gaborone (UB Area)",
      type: "apartment",
      bedrooms: "2",
      bathrooms: "1",
      image: "https://placehold.co/300x200/228B22/ffffff?text=Apt+1",
      features: ["WiFi", "Parking", "Secure"],
      safety: 8,
      condition: 9,
    },
    {
      id: 2,
      title: "Cozy Studio, Block 5",
      price: 2800,
      location: "Gaborone (Block 5)",
      type: "studio",
      bedrooms: "1",
      bathrooms: "1",
      image: "https://placehold.co/300x200/12B886/ffffff?text=Studio+1",
      features: ["Kitchenette", "Aircon"],
      safety: 7,
      condition: 7,
    },
    {
      id: 3,
      title: "Shared Room, Village",
      price: 1500,
      location: "Gaborone (Village)",
      type: "room",
      bedrooms: "1",
      bathrooms: "1",
      image: "https://placehold.co/300x200/FFC107/333333?text=Room+1",
      features: ["Shared Kitchen", "Furnished"],
      safety: 6,
      condition: 6,
    },
    {
      id: 4,
      title: "Spacious House, Phase 2",
      price: 6500,
      location: "Gaborone (Phase 2)",
      type: "house",
      bedrooms: "3",
      bathrooms: "2",
      image: "https://placehold.co/300x200/DC3545/ffffff?text=House+1",
      features: ["Garden", "Pet Friendly", "Garage"],
      safety: 9,
      condition: 8,
    },
    {
      id: 5,
      title: "Affordable Apt, Broadhurst",
      price: 2200,
      location: "Gaborone (Broadhurst)",
      type: "apartment",
      bedrooms: "1",
      bathrooms: "1",
      image: "https://placehold.co/300x200/007BFF/ffffff?text=Apt+2",
      features: ["Security", "Balcony"],
      safety: 7,
      condition: 7,
    },
    {
      id: 6,
      title: "3-Bed Townhouse, CBD",
      price: 7000,
      location: "Gaborone (CBD)",
      type: "house",
      bedrooms: "3",
      bathrooms: "2.5",
      image: "https://placehold.co/300x200/6F42C1/ffffff?text=House+2",
      features: ["Modern", "Pool Access", "Gym"],
      safety: 9,
      condition: 9,
    },
    {
      id: 7,
      title: "Single Room near BIUST",
      price: 1800,
      location: "Palapye (BIUST Area)",
      type: "room",
      bedrooms: "1",
      bathrooms: "1",
      image: "https://placehold.co/300x200/FD7E14/333333?text=Room+Palapye",
      features: ["Study Desk", "Quiet Area"],
      safety: 7,
      condition: 8,
    },
  ];

  const listingsContainer = document.querySelector(
    "#property-listings .property-listings-container"
  );
  const noListingsMessage = document.getElementById("noListingsMessage");

  function createPropertyCard(property) {
    const card = document.createElement("div");
    card.className = "property-card animate";
    // Corrected the data-property-title attribute to use HTML entities for quotes
    card.innerHTML = `
            <img src="${property.image}" alt="${
      property.title
    }" class="property-image" onerror="this.src='https://placehold.co/300x200/cccccc/333333?text=Image+Not+Found';">
            <div class="property-details">
                <div class="property-price">P ${property.price.toLocaleString()}/month</div>
                <h3 class="property-title">${property.title}</h3>
                <div class="property-location"><i class="fas fa-map-marker-alt"></i> ${
                  property.location
                }</div>
                <div class="property-features">
                    <span class="property-feature"><i class="fas fa-bed"></i> ${
                      property.bedrooms === "studio"
                        ? "Studio"
                        : property.bedrooms + " Bed(s)"
                    }</span>
                    <span class="property-feature"><i class="fas fa-bath"></i> ${
                      property.bathrooms
                    } Bath(s)</span>
                </div>
                <div class="property-tags" style="margin-bottom:0.5rem; display:flex; flex-wrap:wrap; gap:0.3rem;">
                    ${property.features
                      .map(
                        (f) =>
                          `<span style="font-size:0.8rem; background: #f0f0f0; padding:0.2rem 0.5rem; border-radius:3px;">${f}</span>`
                      )
                      .join("")}
                </div>
                <button class="btn btn-sm open-modal" data-modal="review-modal" style="width:48%; margin-top:0.5rem; background-color: var(--secondary);" data-property-title="${property.title
                  .replace(/"/g, "&quot;")
                  .replace(/'/g, "&#39;")}">Review</button>
                <button class="btn btn-sm" style="width:48%; margin-top:0.5rem; float:right;" onclick="alert('Viewing details for: ${property.title
                  .replace(/'/g, "\\'")
                  .replace(/"/g, "&quot;")}')">View Details</button>
            </div>
        `;

    const reviewBtn = card.querySelector(
      '.open-modal[data-modal="review-modal"]'
    );
    if (reviewBtn) {
      reviewBtn.addEventListener(
        "click",
        function () {
          const propertyTitle = this.dataset.propertyTitle;
          const reviewModalTitle = document.getElementById("reviewModalTitle");
          if (reviewModalTitle) {
            reviewModalTitle.textContent = `Write a Review for ${propertyTitle}`;
          }
        },
        true
      );
    }
    return card;
  }

  async function displayProperties() {
    if (!listingsContainer || !noListingsMessage) return;
    listingsContainer.innerHTML = "";

    const locationFilter = document.getElementById("filterLocation").value;
    const priceFilter = document.getElementById("filterPriceRange").value;
    const typeFilter = document.getElementById("filterPropertyType").value;
    const bedroomsFilter = document.getElementById("filterBedrooms").value;

    const properties = await fetchProperties();
    const filteredProperties = properties.filter((p) => {
      const priceMatch =
        priceFilter === "all" ||
        (priceFilter === "0-2000" && p.price <= 2000) ||
        (priceFilter === "2001-4000" && p.price > 2000 && p.price <= 4000) ||
        (priceFilter === "4001-6000" && p.price > 4000 && p.price <= 6000) ||
        (priceFilter === "6000+" && p.price > 6000);
      const typeMatch = typeFilter === "all" || p.type === typeFilter;
      const locationMatch =
        locationFilter === "all" ||
        (p.location &&
          p.location.toLowerCase().includes(locationFilter.toLowerCase()));
      let bedroomsAsNumber = p.bedrooms;
      if (p.bedrooms === "studio" || p.bedrooms === "room")
        bedroomsAsNumber = 1;
      else bedroomsAsNumber = parseInt(p.bedrooms);
      const bedroomsMatch =
        bedroomsFilter === "all" ||
        (bedroomsFilter === "1" && bedroomsAsNumber == 1) ||
        (bedroomsFilter === "2" && bedroomsAsNumber == 2) ||
        (bedroomsFilter === "3" && bedroomsAsNumber >= 3);
      return priceMatch && typeMatch && locationMatch && bedroomsMatch;
    });
    if (filteredProperties.length === 0) {
      noListingsMessage.style.display = "block";
    } else {
      noListingsMessage.style.display = "none";
      filteredProperties.forEach((prop) =>
        listingsContainer.appendChild(createPropertyCard(prop))
      );
    }
  }

  // --- ADD LISTING MODAL FUNCTIONALITY ---
  const photoUploadGridInput = document.querySelector(
    '#photoUploadGrid input[type="file"]'
  );
  const photoPreviewContainer = document.getElementById(
    "photoPreviewContainer"
  );
  const idUploadInput = document.querySelector('#idUpload input[type="file"]');
  const deedUploadInput = document.querySelector(
    '#deedUpload input[type="file"]'
  );
  const amenitiesList = document.getElementById("amenitiesList");
  const conditionValue = document.getElementById("conditionValue");
  const safetyValue = document.getElementById("safetyValue");

  if (addListingModal) {
    if (photoUploadGridInput && photoPreviewContainer) {
      const photoUploadPlaceholderLabel = document.querySelector(
        "#photoUploadGrid .photo-upload-item"
      );
      if (photoUploadPlaceholderLabel) {
        photoUploadPlaceholderLabel.addEventListener("click", () =>
          photoUploadGridInput.click()
        );
      }

      photoUploadGridInput.addEventListener("change", function (event) {
        photoPreviewContainer.innerHTML = "";
        const files = event.target.files;
        if (files.length > 5) {
          alert("You can upload a maximum of 5 photos.");
          this.value = "";
          return;
        }
        Array.from(files).forEach((file) => {
          if (file.size > 5 * 1024 * 1024) {
            alert(`File ${file.name} is too large (max 5MB).`);
            return;
          }
          if (!file.type.startsWith("image/")) {
            alert(`File ${file.name} is not an image.`);
            return;
          }
          const reader = new FileReader();
          reader.onload = (e) => {
            const previewItem = document.createElement("div");
            previewItem.className = "photo-upload-item";
            previewItem.style.borderStyle = "solid";
            previewItem.innerHTML = `
                            <img src="${e.target.result}" alt="Photo preview" class="photo-preview" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover;">
                            <button type="button" class="photo-delete" style="display:block; position:absolute; top:5px; right:5px; z-index:2;">×</button>
                        `;
            photoPreviewContainer.appendChild(previewItem);
            previewItem
              .querySelector(".photo-delete")
              .addEventListener("click", (evt) => {
                evt.stopPropagation();
                previewItem.remove();
                if (photoPreviewContainer.children.length === 0) {
                  photoUploadGridInput.value = "";
                }
              });
          };
          reader.readAsDataURL(file);
        });
      });
    }

    function setupDocumentUpload(uploadElementId) {
      const uploadElement = document.getElementById(uploadElementId);
      if (!uploadElement) return;
      const input = uploadElement.querySelector('input[type="file"]');
      const previewDiv = uploadElement.querySelector(".upload-preview");
      const filenameSpan = previewDiv
        ? previewDiv.querySelector(".filename")
        : null;
      const placeholderP = uploadElement.querySelector("p");

      if (input && previewDiv && filenameSpan && placeholderP) {
        uploadElement.addEventListener("click", () => input.click());
        input.addEventListener("change", function () {
          if (this.files && this.files[0]) {
            const file = this.files[0];
            if (file.size > 5 * 1024 * 1024) {
              alert(`File ${file.name} is too large (max 5MB).`);
              this.value = "";
              previewDiv.classList.remove("active");
              placeholderP.style.display = "block";
              return;
            }
            filenameSpan.textContent = file.name;
            previewDiv.classList.add("active");
            placeholderP.style.display = "none";
          } else {
            previewDiv.classList.remove("active");
            placeholderP.style.display = "block";
          }
        });
      }
    }
    setupDocumentUpload("idUpload");
    setupDocumentUpload("deedUpload");

    if (amenityInput && amenitiesList) {
      amenityInput.addEventListener("keypress", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          const amenityText = this.value.trim();
          if (amenityText) {
            const tag = document.createElement("span");
            tag.className = "amenity-tag";
            tag.textContent = amenityText;
            const removeBtn = document.createElement("button");
            removeBtn.type = "button";
            removeBtn.innerHTML = "×";
            removeBtn.onclick = () => tag.remove();
            tag.appendChild(removeBtn);
            amenitiesList.appendChild(tag);
            this.value = "";
          }
        }
      });
    }

    const addListingForm = document.getElementById("addListingForm");
    if (addListingForm) {
      addListingForm.addEventListener("submit", function (e) {
        e.preventDefault();
        const title = document.getElementById("listingTitle").value;
        const price = document.getElementById("listingPrice").value;
        if (!title || !price) {
          alert("Please fill all required fields for the listing.");
          return;
        }
        if (photoPreviewContainer.children.length < 3) {
          alert("Please upload at least 3 property photos.");
          return;
        }
        if (!idUploadInput.files[0] || !deedUploadInput.files[0]) {
          alert("Please upload ID and Title Deed documents.");
          return;
        }

        console.log("Listing submitted (simulation).");
        alert("Property listing submitted for review!");
        addListingForm.reset();
        if (amenitiesList) amenitiesList.innerHTML = "";
        if (photoPreviewContainer) photoPreviewContainer.innerHTML = "";
        if (photoUploadGridInput) photoUploadGridInput.value = "";
        document.querySelectorAll(".upload-preview").forEach((p) => {
          p.classList.remove("active");
          if (p.querySelector(".filename"))
            p.querySelector(".filename").textContent = "";
        });
        document
          .querySelectorAll(".document-upload p")
          .forEach((p) => (p.style.display = "block"));
        if (conditionValue)
          conditionValue.textContent = conditionRating.value = "7";
        if (safetyValue) safetyValue.textContent = safetyRating.value = "7";
        closeModal(addListingModal);
      });
    }
  }

  // --- LANDLORD DASHBOARD CHARTS & ACTIVITY BUTTONS ---
  let incomeChartInstance, propertyChartInstance;
  function initializeCharts() {
    const incomeCtx = document.getElementById("incomeChart");
    const propertyCtx = document.getElementById("propertyChart");

    if (incomeCtx) {
      if (incomeChartInstance) incomeChartInstance.destroy();
      incomeChartInstance = new Chart(incomeCtx.getContext("2d"), {
        type: "line",
        data: {
          labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
          datasets: [
            {
              label: "Monthly Income (P)",
              data: [10000, 11200, 10800, 11500, 11900, 12500],
              borderColor: "var(--primary)",
              backgroundColor: "rgba(34, 139, 34, 0.1)",
              tension: 0.3,
              fill: true,
            },
          ],
        },
        options: { responsive: true, maintainAspectRatio: false },
      });
    }

    if (propertyCtx) {
      if (propertyChartInstance) propertyChartInstance.destroy();
      propertyChartInstance = new Chart(propertyCtx.getContext("2d"), {
        type: "doughnut",
        data: {
          labels: ["Rented", "Vacant"],
          datasets: [
            {
              label: "Property Occupancy",
              data: [4, 1],
              backgroundColor: ["var(--primary)", "#e0e0e0"],
            },
          ],
        },
        options: { responsive: true, maintainAspectRatio: false },
      });
    }
  }
  const activityViewButtons = document.querySelectorAll(
    ".recent-activity .view-activity-btn"
  );
  activityViewButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const activityDetails = this.dataset.activity || "Selected activity";
      alert(`Viewing details for: ${activityDetails}`);
    });
  });

  // --- CHAT WIDGET FUNCTIONALITY ---
  const chatWidget = document.getElementById("chatWidget");
  const chatHeader = document.getElementById("chatHeader");
  const chatToggle = document.getElementById("chatToggle");
  const chatMessagesContainer = document.getElementById("chatMessages");
  const messageInput = document.getElementById("messageInput");
  const sendMessageBtn = document.getElementById("sendMessage");

  if (chatWidget && chatHeader && chatToggle) {
    chatHeader.addEventListener("click", () => {
      chatWidget.classList.toggle("expanded");
      chatToggle.innerHTML = chatWidget.classList.contains("expanded")
        ? '<i class="fas fa-chevron-down"></i>'
        : '<i class="fas fa-chevron-up"></i>';
    });

    if (sendMessageBtn && messageInput && chatMessagesContainer) {
      function addChatMessage(text, type = "sent") {
        const messageDiv = document.createElement("div");
        messageDiv.className = `message ${type}`;
        messageDiv.innerHTML = `
                    <div class="message-content">${text}</div>
                    <div class="message-time">${new Date().toLocaleTimeString(
                      [],
                      { hour: "2-digit", minute: "2-digit" }
                    )}</div>
                `;
        chatMessagesContainer.appendChild(messageDiv);
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
      }

      sendMessageBtn.addEventListener("click", () => {
        const text = messageInput.value.trim();
        if (text) {
          addChatMessage(text, "sent");
          messageInput.value = "";
          setTimeout(() => {
            addChatMessage(
              "Thanks for your message! A support agent will be with you shortly.",
              "received"
            );
          }, 1000);
        }
      });
      messageInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          sendMessageBtn.click();
        }
      });
    }
  }

  // --- REVIEW MODAL STARS & SUBMISSION ---
  const reviewModal = document.getElementById("review-modal");
  const reviewRatingStarsContainer =
    document.getElementById("reviewRatingStars");
  const selectedRatingInput = document.getElementById("selectedRating");
  const reviewForm = document.getElementById("reviewForm");
  const reviewFormSuccess = document.getElementById("reviewFormSuccess");

  if (reviewRatingStarsContainer && selectedRatingInput) {
    const stars = Array.from(reviewRatingStarsContainer.querySelectorAll("i"));
    stars.forEach((star) => {
      star.addEventListener("mouseover", function () {
        const currentValue = parseInt(this.dataset.value);
        stars.forEach((s, i) => {
          s.className = i < currentValue ? "fas fa-star" : "far fa-star";
        });
      });
      star.addEventListener("mouseout", function () {
        const selectedValue = parseInt(selectedRatingInput.value) || 0;
        stars.forEach((s, i) => {
          s.className = i < selectedValue ? "fas fa-star" : "far fa-star";
        });
      });
      star.addEventListener("click", function () {
        selectedRatingInput.value = this.dataset.value;
        const selectedValue = parseInt(selectedRatingInput.value);
        stars.forEach((s, i) => {
          s.className = i < selectedValue ? "fas fa-star" : "far fa-star";
        });
      });
    });
  }
  if (reviewForm && reviewModal) {
    reviewForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const rating = selectedRatingInput.value;
      const reviewText = document.getElementById("reviewText").value.trim();

      if (!rating || rating === "0") {
        alert("Please select a star rating.");
        return;
      }
      if (!reviewText) {
        alert("Please write your review.");
        return;
      }
      console.log(`Review Submitted: Rating ${rating}, Text: ${reviewText}`);
      if (reviewFormSuccess) {
        reviewFormSuccess.textContent = "Thank you for your review!";
        reviewFormSuccess.style.display = "block";
      }
      reviewForm.reset();
      if (reviewRatingStarsContainer)
        reviewRatingStarsContainer
          .querySelectorAll("i")
          .forEach((s) => (s.className = "far fa-star"));
      selectedRatingInput.value = "";

      setTimeout(() => {
        if (reviewFormSuccess) reviewFormSuccess.style.display = "none";
        closeModal(reviewModal);
      }, 2500);
    });
  }

  // --- LANDLORDS LEFT UPDATE (EXAMPLE) ---
  const landlordsLeftSpan = document.getElementById("landlordsLeft");
  if (landlordsLeftSpan) {
    let spots = 10;
    landlordsLeftSpan.textContent = spots;
  }
}); // End DOMContentLoaded

// Remove all localStorage usage for studentData/landlordData
// Use currentUser (fetched from backend) for all user/session logic
let currentUser = null;

async function fetchCurrentUser() {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
    if (res.ok) {
      currentUser = await res.json();
    } else {
      currentUser = null;
    }
  } catch {
    currentUser = null;
  }
}

// On page load, fetch user if logged in
fetchCurrentUser();

// Example usage in login:
const studentLoginForm = document.getElementById("studentLoginForm");
if (studentLoginForm) {
  studentLoginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    const email = document.getElementById("studentLoginEmail").value.trim();
    const password = document.getElementById("studentLoginPassword").value;
    if (!email || !password) {
      alert("Please enter your email and password.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role: "student" }),
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");
      await fetchCurrentUser();
      alert("Student login successful!");
      closeModal(document.getElementById("login"));
      openModal("property-listings");
      displayProperties();
    } catch (err) {
      alert(err.message || "Login failed. Please try again.");
    }
  });
}

// Example usage in review:
async function handleReviewSubmit(e) {
  e.preventDefault();
  if (selectedRating === 0) {
    alert("Please select a rating");
    return;
  }
  const reviewText = e.target.querySelector("textarea").value;
  if (!currentUser || !currentUser.verified) {
    alert("Please log in as a student to write a review.");
    return;
  }
  const propertyId = e.target.dataset.propertyId;
  try {
    const res = await fetch(`${API_BASE}/reviews/${propertyId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: selectedRating, text: reviewText }),
      credentials: 'include'
    });
    if (!res.ok) throw new Error("Failed to submit review");
    alert("Thank you for your review!");
    reviewModal.classList.remove("active");
    e.target.reset();
    selectedRating = 0;
    updateStars(0);
  } catch (err) {
    alert("Failed to submit review. Please try again.");
    console.error(err);
  }
}
