// Property Details Page Logic (Dynamic, Accessible, AJAX, Reviews)
document.addEventListener("DOMContentLoaded", async function () {
  // --- Session/User Fetch (no localStorage) ---
  let currentUser = null;
  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (res.ok) currentUser = await res.json();
  } catch {}

  // --- Get Property ID from URL ---
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get("id");
  if (!propertyId) {
    document.getElementById("propertyTitle").textContent =
      "Property not found.";
    return;
  }

  // --- Fetch & Render Property Details ---
  try {
    const res = await fetch(`/api/properties/${propertyId}`);
    if (!res.ok) throw new Error("Failed to fetch property");
    const property = await res.json();
    renderProperty(property);
    fetchSimilarProperties(propertyId);
    fetchReviews(propertyId);
  } catch (err) {
    document.getElementById("propertyTitle").textContent =
      "Failed to load property.";
  }

  // --- Render Property ---
  function renderProperty(property) {
    document.getElementById("propertyTitle").textContent = property.title;
    document.getElementById(
      "propertyLocation"
    ).innerHTML = `<i class='fas fa-map-marker-alt'></i> ${property.location}`;
    document.getElementById(
      "propertyPrice"
    ).textContent = `P${property.price}/month`;
    // Gallery
    const gallery = document.getElementById("propertyGallery");
    gallery.innerHTML = `<img src="${
      property.images?.[0] || "/img/default-property.jpg"
    }" alt="Main Property Image" class="main-image" />`;
    if (property.images && property.images.length > 1) {
      gallery.innerHTML += `<div class='thumbnail-grid'>${property.images
        .slice(1)
        .map(
          (img) => `<img src='${img}' class='thumbnail' alt='Property image' />`
        )
        .join("")}</div>`;
    }
    // Details
    const details = document.getElementById("propertyDetails");
    details.innerHTML = `
      <div class='features-grid'>
        <div class='feature-item'><i class='fas fa-bed feature-icon'></i><div><h3>${
          property.beds
        } Bedrooms</h3></div></div>
        <div class='feature-item'><i class='fas fa-bath feature-icon'></i><div><h3>${
          property.baths
        } Bathrooms</h3></div></div>
        <div class='feature-item'><i class='fas fa-ruler-combined feature-icon'></i><div><h3>${
          property.size
        } sqft</h3></div></div>
        <div class='feature-item'><i class='fas fa-building feature-icon'></i><div><h3>${
          property.type
        }</h3></div></div>
      </div>
      <h2 class='section-title'>Description</h2>
      <p>${property.description}</p>
      <h2 class='section-title'>Amenities</h2>
      <div class='amenities-list'>${(property.amenities || [])
        .map(
          (a) =>
            `<div class='amenity-item'><i class='fas fa-${
              a.icon || "check"
            } amenity-icon'></i><span>${a.name || a}</span></div>`
        )
        .join("")}</div>
    `;
    // Contact section
    document.getElementById("contactSection").innerHTML = `
      <h2 class='section-title'>Contact Landlord</h2>
      <div class='landlord-contact'>
        <span><i class='fas fa-user'></i> ${
          property.landlord?.name || "Landlord"
        }</span><br/>
        <span><i class='fas fa-envelope'></i> <a href='mailto:${
          property.landlord?.email
        }'>${property.landlord?.email}</a></span>
      </div>
      <h2 class='section-title'>Send Inquiry</h2>
      <form class='contact-form' id='inquiryForm'>
        <div class='form-group'>
          <label class='form-label'>Message</label>
          <textarea class='form-textarea' placeholder='Your message to the landlord' required></textarea>
        </div>
        <button type='submit' class='btn btn-primary'><i class='fas fa-paper-plane'></i> Send Inquiry</button>
      </form>
      <h2 class='section-title'>Request Viewing</h2>
      <form class='contact-form' id='viewingForm'>
        <div class='form-group'>
          <label class='form-label'>Preferred Date</label>
          <input type='date' class='form-input' required />
        </div>
        <div class='form-group'>
          <label class='form-label'>Preferred Time</label>
          <select class='form-input' required>
            <option value=''>Select time</option>
            <option value='morning'>Morning (9AM - 12PM)</option>
            <option value='afternoon'>Afternoon (1PM - 4PM)</option>
            <option value='evening'>Evening (5PM - 7PM)</option>
          </select>
        </div>
        <button type='submit' class='btn btn-secondary'><i class='fas fa-calendar-check'></i> Schedule Viewing</button>
      </form>
    `;
    setupContactForms(property._id);
  }

  // --- Contact/Viewing Forms ---
  function setupContactForms(propertyId) {
    const inquiryForm = document.getElementById("inquiryForm");
    if (inquiryForm) {
      inquiryForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const message = this.querySelector("textarea").value;
        try {
          const res = await fetch("/api/inquiries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ propertyId, message }),
            credentials: "include",
          });
          if (!res.ok) throw new Error("Failed to send inquiry");
          alert("Inquiry sent successfully!");
          this.reset();
        } catch (err) {
          alert("Failed to send inquiry: " + err.message);
        }
      });
    }
    const viewingForm = document.getElementById("viewingForm");
    if (viewingForm) {
      viewingForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const date = this.querySelector('input[type="date"]').value;
        const time = this.querySelector("select").value;
        try {
          const res = await fetch("/api/viewings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ propertyId, date, time }),
            credentials: "include",
          });
          if (!res.ok) throw new Error("Failed to schedule viewing");
          alert("Viewing scheduled!");
          this.reset();
        } catch (err) {
          alert("Failed to schedule viewing: " + err.message);
        }
      });
    }
  }

  // --- Fetch & Render Similar Properties ---
  async function fetchSimilarProperties(propertyId) {
    try {
      const res = await fetch(`/api/properties/${propertyId}/similar`);
      if (!res.ok) throw new Error("Failed to fetch similar properties");
      const properties = await res.json();
      renderSimilarProperties(properties);
    } catch (err) {
      document.getElementById("similarPropertiesGrid").innerHTML =
        '<div class="empty-state">No similar properties found.</div>';
    }
  }
  function renderSimilarProperties(properties) {
    const grid = document.getElementById("similarPropertiesGrid");
    grid.innerHTML = "";
    if (!properties.length) {
      grid.innerHTML =
        '<div class="empty-state">No similar properties found.</div>';
      return;
    }
    properties.forEach((property) => {
      const card = document.createElement("div");
      card.className = "property-card";
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", `View details for ${property.title}`);
      card.innerHTML = `
        <img src="${property.imageUrl || "/img/default-property.jpg"}" alt="${
        property.title
      }" />
        <div class="property-card-content">
          <h3 class="property-card-title">${property.title}</h3>
          <p class="property-card-price">P${property.price}/month</p>
          <p class="property-card-location">${property.location}</p>
          <div class="property-card-features">
            <span><i class="fas fa-bed"></i> ${property.beds} Bed${
        property.beds > 1 ? "s" : ""
      }</span>
            <span><i class="fas fa-bath"></i> ${property.baths} Bath${
        property.baths > 1 ? "s" : ""
      }</span>
          </div>
        </div>
      `;
      card.addEventListener("click", () => {
        window.location.href = `/property-details.html?id=${property._id}`;
      });
      card.addEventListener("keypress", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          window.location.href = `/property-details.html?id=${property._id}`;
        }
      });
      grid.appendChild(card);
    });
  }

  // --- Reviews Modal Logic ---
  // Open modal
  const reviewModal = document.getElementById("review-modal");
  const reviewForm = document.getElementById("reviewForm");
  const reviewModalTitle = document.getElementById("reviewModalTitle");
  const reviewRatingStars = document.getElementById("reviewRatingStars");
  const reviewFormSuccess = document.getElementById("reviewFormSuccess");
  let selectedRating = 0;

  // Render stars
  function renderStars(rating) {
    reviewRatingStars.innerHTML = "";
    for (let i = 1; i <= 5; i++) {
      const star = document.createElement("i");
      star.className = `fa-star ${i <= rating ? "fas" : "far"}`;
      star.tabIndex = 0;
      star.setAttribute("role", "button");
      star.setAttribute("aria-label", `${i} star${i > 1 ? "s" : ""}`);
      star.addEventListener("click", () => {
        selectedRating = i;
        renderStars(selectedRating);
      });
      star.addEventListener("keypress", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          selectedRating = i;
          renderStars(selectedRating);
        }
      });
      reviewRatingStars.appendChild(star);
    }
  }
  renderStars(selectedRating);

  // Modal open/close
  document.querySelectorAll(".modal-close").forEach((el) => {
    el.addEventListener("click", () => reviewModal.classList.remove("active"));
  });
  window.addEventListener("click", (e) => {
    if (e.target === reviewModal) reviewModal.classList.remove("active");
  });

  // Open modal button (could be on page)
  window.openReviewModal = function () {
    if (!currentUser || !currentUser.verified) {
      alert("Please log in and verify your email to write a review.");
      return;
    }
    reviewModal.classList.add("active");
    reviewFormSuccess.textContent = "";
    renderStars(0);
    selectedRating = 0;
  };

  // Submit review
  reviewForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (!selectedRating) {
      reviewFormSuccess.textContent = "Please select a rating.";
      return;
    }
    const reviewText = document.getElementById("reviewText").value.trim();
    try {
      const res = await fetch(`/api/reviews/${propertyId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: selectedRating, text: reviewText }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to submit review");
      reviewFormSuccess.textContent = "Thank you for your review!";
      reviewForm.reset();
      renderStars(0);
      selectedRating = 0;
      fetchReviews(propertyId);
    } catch (err) {
      reviewFormSuccess.textContent = "Failed to submit review.";
    }
  });

  // --- Fetch & Render Reviews ---
  async function fetchReviews(propertyId) {
    // You can add a reviews section below the property details if desired
    // Example: fetch(`/api/reviews/${propertyId}`) and render reviews
  }
});
