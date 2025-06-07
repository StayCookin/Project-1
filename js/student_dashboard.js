document.addEventListener("DOMContentLoaded", function () {
  // Check if user is authenticated
  const studentData = JSON.parse(localStorage.getItem("studentData"));
  if (!studentData || studentData.role !== "student") {
    // Redirect to landing page if not authenticated
    window.location.href = "index.html";
    return;
  }

  // Update profile image and name
  const profileImages = document.querySelectorAll(
    ".profile-image, .profile-image-small"
  );
  profileImages.forEach((img) => {
    if (studentData.profileImage) {
      img.src = studentData.profileImage;
    }
  });

  const welcomeHeader = document.querySelector(".sidebar-header h2");
  if (welcomeHeader) {
    welcomeHeader.textContent = `Welcome, ${studentData.name}`;
  }

  // Handle navigation
  const navLinks = document.querySelectorAll(".sidebar-menu a");
  navLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const href = this.getAttribute("href");

      if (href === "#") {
        // Dashboard link - stay on current page
        return;
      } else if (href === "#logout") {
        // Logout confirmation
        if (confirm("Are you sure you want to logout?")) {
          localStorage.removeItem("studentData");
          window.location.href = "index.html";
        }
      } else {
        // Remove # from href and navigate
        window.location.href = href;
      }
    });
  });

  // Handle property card actions
  const propertyCards = document.querySelectorAll(".property-card");
  propertyCards.forEach((card) => {
    const viewDetailsBtn = card.querySelector(".btn-primary");
    const saveBtn = card.querySelector(".btn-secondary");

    // Handle view details button click
    viewDetailsBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      const title = card.querySelector(".property-title").textContent;
      window.location.href = `property-details.html?title=${encodeURIComponent(
        title
      )}`;
    });

    // Handle save button click
    saveBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      const title = card.querySelector(".property-title").textContent;
      console.log(`Saved property: ${title}`);
      this.textContent = this.textContent === "Save" ? "Saved" : "Save";
    });

    // Handle card click (excluding buttons)
    card.addEventListener("click", function (e) {
      if (!e.target.closest(".property-actions")) {
        const title = card.querySelector(".property-title").textContent;
        window.location.href = `property-details.html?title=${encodeURIComponent(
          title
        )}`;
      }
    });
  });

  // Handle search and filter changes
  const searchInput = document.querySelector(".search-input");
  const filterSelects = document.querySelectorAll(".filter-select");
  const propertyGrid = document.querySelector(".property-grid");

  function filterProperties() {
    const searchTerm = searchInput.value.toLowerCase();
    const amenities = filterSelects[0].value;
    const location = filterSelects[1].value;
    const budget = filterSelects[2].value;
    const condition = filterSelects[3].value;

    const filteredProperties = properties.filter((property) => {
      // Search term filter
      const matchesSearch =
        property.title.toLowerCase().includes(searchTerm) ||
        property.location.toLowerCase().includes(searchTerm);

      // Amenities filter
      const matchesAmenities =
        !amenities || property.amenities.includes(amenities);

      // Location filter
      const matchesLocation = !location || property.area === location;

      // Budget filter
      let matchesBudget = true;
      if (budget) {
        const [min, max] = budget.split("-").map(Number);
        if (max) {
          matchesBudget = property.price >= min && property.price <= max;
        } else {
          matchesBudget = property.price >= min;
        }
      }

      // Condition filter
      const matchesCondition = !condition || property.condition === condition;

      return (
        matchesSearch &&
        matchesAmenities &&
        matchesLocation &&
        matchesBudget &&
        matchesCondition
      );
    });

    displayProperties(filteredProperties);
  }

  function displayProperties(properties) {
    propertyGrid.innerHTML = properties
      .map(
        (property) => `
                    <div class="property-card">
                        <img src="${property.image}" alt="${
          property.title
        }" class="property-image">
                        <div class="property-details">
                            <div>
                                <div class="property-price">P${
                                  property.price
                                }/month</div>
                                <h3 class="property-title">${
                                  property.title
                                }</h3>
                                <p class="property-location">${
                                  property.location
                                }</p>
                                <div class="property-features">
                                    <span><i class="fas fa-bed"></i> ${
                                      property.beds
                                    } Beds</span>
                                    <span><i class="fas fa-bath"></i> ${
                                      property.baths
                                    } Baths</span>
                                    <span><i class="fas fa-ruler-combined"></i> ${
                                      property.area
                                    } sqft</span>
                                </div>
                            </div>
                            <div class="property-actions">
                                <button class="btn btn-primary" onclick="window.location.href='property-details.html?title=${encodeURIComponent(
                                  property.title
                                )}'">
                                    <i class="fas fa-eye"></i> View Details
                                </button>
                                <button class="btn btn-secondary" onclick="toggleSaveProperty(${
                                  property.id
                                })">
                                    <i class="fas fa-heart"></i> Save
                                </button>
                            </div>
                        </div>
                    </div>
                `
      )
      .join("");
  }

  // Event listeners for search and filters
  searchInput.addEventListener("input", filterProperties);
  filterSelects.forEach((select) => {
    select.addEventListener("change", filterProperties);
  });

  // Initial display
  displayProperties(properties);

  // Save property functionality
  window.toggleSaveProperty = function (propertyId) {
    const savedProperties = JSON.parse(
      localStorage.getItem("savedProperties") || "[]"
    );
    const index = savedProperties.indexOf(propertyId);

    if (index === -1) {
      savedProperties.push(propertyId);
      alert("Property saved successfully!");
    } else {
      savedProperties.splice(index, 1);
      alert("Property removed from saved properties.");
    }

    localStorage.setItem("savedProperties", JSON.stringify(savedProperties));
    filterProperties(); // Refresh the display
  };

  // Add a section to display student inquiries
  const dashboardMain =
    document.querySelector(".main-content") || document.body;
  const inquiriesSection = document.createElement("section");
  inquiriesSection.className = "student-inquiries-section";
  inquiriesSection.innerHTML = `
              <h2 style="margin-top:2rem;">My Inquiries</h2>
              <div id="student-inquiries-list">Loading...</div>
            `;
  dashboardMain.appendChild(inquiriesSection);

  async function fetchStudentInquiries() {
    const token = localStorage.getItem("authToken");
    if (!token) {
      document.getElementById("student-inquiries-list").textContent =
        "You must be logged in to view your inquiries.";
      return;
    }
    try {
      const res = await fetch("/api/inquiries/student", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch inquiries");
      const inquiries = await res.json();
      if (!Array.isArray(inquiries) || inquiries.length === 0) {
        document.getElementById("student-inquiries-list").textContent =
          "No inquiries sent yet.";
        return;
      }
      document.getElementById("student-inquiries-list").innerHTML = inquiries
        .map(
          (inq) => `
                  <div class="inquiry-item" style="border:1px solid #eee;padding:1rem;margin-bottom:1rem;border-radius:8px;">
                    <div><b>Property:</b> ${
                      inq.property?.title || inq.propertyId
                    }</div>
                    <div><b>Message:</b> ${inq.message}</div>
                    <div><b>Date:</b> ${new Date(
                      inq.createdAt
                    ).toLocaleString()}</div>
                  </div>
                `
        )
        .join("");
    } catch (err) {
      document.getElementById("student-inquiries-list").textContent =
        "Error loading inquiries.";
    }
  }

  fetchStudentInquiries();
});
