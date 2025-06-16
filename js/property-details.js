document.addEventListener("DOMContentLoaded", function () {
  // Check if user is authenticated
  const studentData = JSON.parse(localStorage.getItem("studentData"));
  if (!studentData || studentData.role !== "student") {
    // Redirect to landing page if not authenticated
    window.location.href = "index.html";
    return;
  }

  // Fetch property details from backend and render
  fetchPropertyDetails();

  async function fetchPropertyDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const propertyId = urlParams.get("id");
    if (!propertyId) {
      document.getElementById("propertyTitle").textContent =
        "Property not found.";
      return;
    }
    try {
      const res = await fetch(`/api/properties/${propertyId}`);
      if (!res.ok) throw new Error("Failed to fetch property");
      const property = await res.json();
      renderProperty(property);
      fetchSimilarProperties(propertyId);
    } catch (err) {
      document.getElementById("propertyTitle").textContent =
        "Failed to load property.";
    }
  }

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
      property.images[0] || "/img/default-property.jpg"
    }" alt="Main Property Image" class="main-image" />`;
    if (property.images.length > 1) {
      gallery.innerHTML += `<div class='thumbnail-grid'>${property.images
        .slice(1)
        .map((img) => `<img src='${img}' class='thumbnail' />`)
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
    <div class='amenities-list'>${property.amenities
      .map(
        (a) =>
          `<div class='amenity-item'><i class='fas fa-${a.icon} amenity-icon'></i><span>${a.name}</span></div>`
      )
      .join("")}</div>
  `;
    // Contact section
    document.getElementById("contactSection").innerHTML = `
    <h2 class='section-title'>Send Inquiry to Landlord</h2>
    <form class='contact-form' id='inquiryForm'>
      <div class='form-group'>
        <label class='form-label'>Message</label>
        <textarea class='form-textarea' placeholder='Your message to the landlord' required></textarea>
      </div>
      <button type='submit' class='btn btn-primary'><i class='fas fa-paper-plane'></i> Send Inquiry</button>
      <div class='form-note' style='margin-top: 0.5rem; color: #888; font-size: 0.95em'>You must be logged in as a student to send an inquiry.</div>
    </form>
    <div style='margin-top: 2rem'>
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
    </div>
  `;
    setupContactForms(property._id);
  }

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
      grid.appendChild(card);
    });
  }
});
