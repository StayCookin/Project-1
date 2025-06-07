const mongoose = require("mongoose");

const propertySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
  },
  type: {
    type: String,
    enum: ["apartment", "house", "studio", "shared"],
    required: true,
  },
  features: {
    bedrooms: Number,
    bathrooms: Number,
    area: Number,
    furnished: Boolean,
    parking: Boolean,
    wifi: Boolean,
    security: Boolean,
    laundry: Boolean,
  },
  images: [
    {
      url: String,
      public_id: String,
    },
  ],
  landlord: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  status: {
    type: String,
    enum: ["available", "rented", "pending"],
    default: "available",
  },
  savedBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  reviews: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Review",
    },
  ],
  averageRating: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for search functionality
propertySchema.index({
  title: "text",
  description: "text",
  location: "text",
});

// Remove analytics-related methods
propertySchema.methods.updateStatus = function (status) {
  this.status = status;
  this.updatedAt = new Date();
  return this.save();
};

module.exports = mongoose.model("Property", propertySchema);
document.addEventListener("DOMContentLoaded", function () {
  // Check if user is authenticated
  const studentData = JSON.parse(localStorage.getItem("studentData"));
  const landlordData = JSON.parse(localStorage.getItem("landlordData"));

  // If no user is logged in, redirect to landing page
  if (!studentData && !landlordData) {
    window.location.href = "index.html";
    return;
  }

  // Update navigation based on user type
  const navLinks = document.querySelector(".nav-links");
  if (studentData) {
    // Student is logged in
    navLinks.innerHTML = `
                    <a href="marketplace.html">Browse Properties</a>
                    <a href="student-dashboard.html">Student Dashboard</a>
                    <a href="#" id="logoutBtn">Logout</a>
                `;
  } else if (landlordData) {
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
        localStorage.removeItem("studentData");
        localStorage.removeItem("landlordData");
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
      if (!studentData) {
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

      if (!studentData && !landlordData) {
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
