document.addEventListener("DOMContentLoaded", function () {
  // Check if user is authenticated
  // const studentData = JSON.parse(localStorage.getItem("studentData"));
  // const landlordData = JSON.parse(localStorage.getItem("landlordData"));

  // If no user is logged in, redirect to landing page
  if (!window.currentUser) {
    window.location.href = "index.html";
    return;
  }

  // Update navigation based on user type
  const navLinks = document.querySelector(".nav-links");
  if (window.currentUser.role === "student") {
    // Student is logged in
    navLinks.innerHTML = `
                    <a href="marketplace.html">Browse Properties</a>
                    <a href="student-dashboard.html">Student Dashboard</a>
                    <a href="#" id="logoutBtn">Logout</a>
                `;
  } else if (window.currentUser.role === "landlord") {
    // Landlord is logged in
    navLinks.innerHTML = `
                    <a href="marketplace.html">Browse Properties</a>
                    <a href="landlord-dashboard.html">Landlord Dashboard</a>
                    <a href="#" id="logoutBtn">Logout</a>
                `;
  }

  // Handle logout
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function (e) {
      e.preventDefault();
      if (confirm("Are you sure you want to logout?")) {
        // localStorage.removeItem("studentData");
        // localStorage.removeItem("landlordData");
        window.currentUser = null;
        window.location.href = "index.html";
      }
    });
  }

  // Handle search and filter changes
  const searchBtn = document.querySelector(".btn-primary");
  const filterSelects = document.querySelectorAll("select");

  searchBtn.addEventListener("click", function () {
    const filters = {};
    filterSelects.forEach((select) => {
      filters[select.id] = select.value;
    });
    console.log("Search filters:", filters);
    // Add search functionality here
  });

  // Handle property card actions
  const propertyCards = document.querySelectorAll(".property-card");
  propertyCards.forEach((card) => {
    const viewBtn = card.querySelector(".btn-primary");
    const saveBtn = card.querySelector(".btn-secondary");

    viewBtn.addEventListener("click", function () {
      const propertyTitle = card.querySelector(".property-title").textContent;
      window.location.href = `property-details.html?title=${encodeURIComponent(
        propertyTitle
      )}`;
    });

    saveBtn.addEventListener("click", function () {
      if (window.currentUser.role !== "student") {
        alert("Please log in as a student to save properties.");
        return;
      }
      const propertyTitle = card.querySelector(".property-title").textContent;
      this.innerHTML =
        this.innerHTML === '<i class="fas fa-heart"></i> Save'
          ? '<i class="fas fa-heart"></i> Saved'
          : '<i class="fas fa-heart"></i> Save';
      console.log(
        `Property ${
          this.innerHTML.includes("Saved") ? "saved" : "unsaved"
        }: ${propertyTitle}`
      );
    });
  });

  // Message bubble functionality
  const messageBubble = document.getElementById("messageBubble");
  const messageDropdown = document.getElementById("messageDropdown");

  messageBubble.addEventListener("click", function () {
    messageDropdown.classList.toggle("active");
  });

  // Close message dropdown when clicking outside
  document.addEventListener("click", function (e) {
    if (
      !messageBubble.contains(e.target) &&
      !messageDropdown.contains(e.target)
    ) {
      messageDropdown.classList.remove("active");
    }
  });

  // Handle message button clicks
  const messageButtons = document.querySelectorAll(".btn-message");
  messageButtons.forEach((button) => {
    button.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();

      if (!window.currentUser) {
        alert("Please log in to send messages.");
        return;
      }

      const propertyTitle =
        this.closest(".property-card").querySelector(
          ".property-title"
        ).textContent;
      // Add your message sending logic here
      console.log(`Opening message interface for property: ${propertyTitle}`);
    });
  });

  // Handle message item clicks
  const messageItems = document.querySelectorAll(".message-item");
  messageItems.forEach((item) => {
    item.addEventListener("click", function () {
      const sender = this.querySelector(".sender").textContent;
      // Add your message viewing logic here
      console.log(`Opening conversation with ${sender}`);
    });
  });

  // Fetch and render properties from backend
  fetchProperties();

  async function fetchProperties(filters = {}) {
    try {
      let url = "/api/properties";
      const params = new URLSearchParams(filters);
      if ([...params].length) url += "?" + params.toString();
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch properties");
      const properties = await res.json();
      renderProperties(properties);
    } catch (err) {
      console.error("Properties fetch error:", err);
      document.getElementById(
        "propertyGrid"
      ).innerHTML = `<div class="empty-state">Failed to load properties.</div>`;
    }
  }

  function renderProperties(properties) {
    const grid = document.getElementById("propertyGrid");
    grid.innerHTML = "";
    if (!properties.length) {
      grid.innerHTML = `<div class="empty-state">No properties found.</div>`;
      return;
    }
    properties.forEach((property) => {
      const card = document.createElement("div");
      card.className = "property-card";
      card.innerHTML = `
      <img src="${property.imageUrl || "/img/default-property.jpg"}" alt="${
        property.title
      }" class="property-image" />
      <div class="property-details">
        <div class="property-price">P${property.price}/month</div>
        <h3 class="property-title">${property.title}</h3>
        <p class="property-location"><i class='fas fa-map-marker-alt'></i> ${
          property.location
        }</p>
        <div class="property-features">
          <span class="feature"><i class="fas fa-bed"></i> ${
            property.beds
          } Beds</span>
          <span class="feature"><i class="fas fa-bath"></i> ${
            property.baths
          } Bath${property.baths > 1 ? "s" : ""}</span>
          <span class="feature"><i class="fas fa-ruler-combined"></i> ${
            property.size
          } sqft</span>
          ${
            property.amenities
              ? property.amenities
                  .map(
                    (a) =>
                      `<span class='feature'><i class='fas fa-${a.icon}'></i> ${a.name}</span>`
                  )
                  .join("")
              : ""
          }
        </div>
        <div class="property-actions">
          <button class="btn btn-primary" onclick="viewDetails('${
            property._id
          }')"><i class="fas fa-eye"></i> View Details</button>
          <button class="btn btn-secondary" onclick="saveProperty('${
            property._id
          }')"><i class="fas fa-heart"></i> Save</button>
          <button class="btn btn-message" onclick="messageLandlord('${
            property.landlordId
          }')"><i class="fas fa-comment"></i> Message</button>
        </div>
      </div>
    `;
      grid.appendChild(card);
    });
  }

  window.viewDetails = function (propertyId) {
    window.location.href = `/property-details.html?id=${propertyId}`;
  };

  window.saveProperty = function (propertyId) {
    fetch(`/api/properties/${propertyId}/save`, { method: "POST" }).then(
      (res) => (res.ok ? alert("Property saved!") : alert("Failed to save."))
    );
  };

  window.messageLandlord = function (landlordId) {
    window.location.href = `/messages.html?to=${landlordId}`;
  };
});

// Mobile menu functionality
const mobileMenuBtn = document.querySelector(".mobile-menu-btn");
const mobileMenu = document.querySelector(".mobile-menu");
const mobileMenuClose = document.querySelector(".mobile-menu-close");
const body = document.body;

function openMobileMenu() {
  mobileMenu.style.display = "block";
  setTimeout(() => {
    mobileMenu.classList.add("active");
  }, 10);
  body.style.overflow = "hidden";
}

function closeMobileMenu() {
  mobileMenu.classList.remove("active");
  setTimeout(() => {
    mobileMenu.style.display = "none";
  }, 300);
  body.style.overflow = "";
}

mobileMenuBtn.addEventListener("click", openMobileMenu);
mobileMenuClose.addEventListener("click", closeMobileMenu);

// Close mobile menu when clicking outside
mobileMenu.addEventListener("click", (e) => {
  if (e.target === mobileMenu) {
    closeMobileMenu();
  }
});

// Handle iOS safe area insets
function updateSafeAreaInsets() {
  const header = document.querySelector(".header");
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty("--vh", `${vh}px`);
}

window.addEventListener("resize", updateSafeAreaInsets);
window.addEventListener("orientationchange", updateSafeAreaInsets);
updateSafeAreaInsets();
