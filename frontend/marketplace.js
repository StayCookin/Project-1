import "../js/firebase-config.js";

document.addEventListener("DOMContentLoaded", function () {
  // Firebase Auth: Check if user is authenticated
  firebase.auth().onAuthStateChanged(async function (user) {
    if (!user) {
      window.location.href = "index.html";
      return;
    }

    // Fetch user role from Firestore (assumes users collection with role field)
    let role = "student";
    try {
      const userDoc = await firebase
        .firestore()
        .collection("users")
        .doc(user.uid)
        .get();
      if (userDoc.exists && userDoc.data().role) {
        role = userDoc.data().role;
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
    }

    // Update navigation based on user type
    const navLinks = document.querySelector(".nav-links");
    if (navLinks) {
      if (role === "student") {
        navLinks.innerHTML = `
          <a href="marketplace.html">Browse Properties</a>
          <a href="student-dashboard.html">Student Dashboard</a>
          <a href="#" id="logoutBtn">Logout</a>
        `;
      } else if (role === "landlord") {
        navLinks.innerHTML = `
          <a href="marketplace.html">Browse Properties</a>
          <a href="landlord-dashboard.html">Landlord Dashboard</a>
          <a href="#" id="logoutBtn">Logout</a>
        `;
      }
    }

    // Handle logout
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async function (e) {
        e.preventDefault();
        if (confirm("Are you sure you want to logout?")) {
          try {
            await firebase.auth().signOut();
            window.location.href = "index.html";
          } catch (error) {
            console.error("Logout error:", error);
            alert("Failed to logout. Please try again.");
          }
        }
      });
    }

    // Fetch and render properties from Firestore
    fetchProperties();

    // Handle search and filter changes
    const searchBtn = document.querySelector(".btn-primary");
    const filterSelects = document.querySelectorAll("select");

    if (searchBtn) {
      searchBtn.addEventListener("click", function () {
        const filters = {};
        filterSelects.forEach((select) => {
          if (select.value) {
            // Only include non-empty values
            filters[select.id] = select.value;
          }
        });
        fetchProperties(filters);
      });
    }

    async function fetchProperties(filters = {}) {
      try {
        let query = firebase.firestore().collection("properties");

        // Apply filters (simple example, expand as needed)
        if (filters.location) {
          query = query.where("location", "==", filters.location);
        }
        if (filters.type) {
          query = query.where("type", "==", filters.type);
        }
        if (filters.price) {
          // Example: price range filter
          if (filters.price === "0-2000") {
            query = query.where("price", ">=", 0).where("price", "<=", 2000);
          } else if (filters.price === "2000-4000") {
            query = query.where("price", ">=", 2000).where("price", "<=", 4000);
          } else if (filters.price === "4000-6000") {
            query = query.where("price", ">=", 4000).where("price", "<=", 6000);
          } else if (filters.price === "6000+") {
            query = query.where("price", ">=", 6000);
          }
        }

        const snapshot = await query.get();
        const properties = snapshot.docs.map((doc) => ({
          _id: doc.id,
          ...doc.data(),
        }));
        renderProperties(properties);
      } catch (err) {
        console.error("Properties fetch error:", err);
        const propertyGrid = document.getElementById("propertyGrid");
        if (propertyGrid) {
          propertyGrid.innerHTML = `<div class="empty-state">Failed to load properties. Please try again later.</div>`;
        }
      }
    }

    function renderProperties(properties) {
      const grid = document.getElementById("propertyGrid");
      if (!grid) {
        console.error("Property grid element not found");
        return;
      }

      grid.innerHTML = "";

      if (!properties || !properties.length) {
        grid.innerHTML = `<div class="empty-state">No properties found.</div>`;
        return;
      }

      properties.forEach((property) => {
        const card = document.createElement("div");
        card.className = "property-card";

        // Safely handle property data with defaults
        const imageUrl = property.imageUrl || "/img/default-property.jpg";
        const title = property.title || "Property Title";
        const price = property.price || 0;
        const location = property.location || "Location not specified";
        const beds = property.beds || 0;
        const baths = property.baths || 0;
        const size = property.size || "N/A";

        card.innerHTML = `
          <img src="${imageUrl}" alt="${title}" class="property-image" onerror="this.src='/img/default-property.jpg'" />
          <div class="property-details">
            <div class="property-price">P${price}/month</div>
            <h3 class="property-title">${title}</h3>
            <p class="property-location"><i class='fas fa-map-marker-alt'></i> ${location}</p>
            <div class="property-features">
              <span class="feature"><i class="fas fa-bed"></i> ${beds} Bed${
          beds !== 1 ? "s" : ""
        }</span>
              <span class="feature"><i class="fas fa-bath"></i> ${baths} Bath${
          baths !== 1 ? "s" : ""
        }</span>
              <span class="feature"><i class="fas fa-ruler-combined"></i> ${size} sqft</span>
              ${
                property.amenities && Array.isArray(property.amenities)
                  ? property.amenities
                      .map(
                        (a) =>
                          `<span class='feature'><i class='fas fa-${
                            a.icon || "star"
                          }'></i> ${a.name || "Amenity"}</span>`
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
              ${
                property.landlordId
                  ? `<button class="btn btn-message" onclick="messageLandlord('${property.landlordId}')"><i class="fas fa-comment"></i> Message</button>`
                  : ""
              }
            </div>
          </div>
        `;
        grid.appendChild(card);
      });
    }

    // Global functions
    window.viewDetails = function (propertyId) {
      if (propertyId) {
        window.location.href = `/property-details.html?id=${propertyId}`;
      }
    };

    window.saveProperty = async function (propertyId) {
      try {
        const user = firebase.auth().currentUser;
        if (!user) {
          alert("Please log in to save properties.");
          return;
        }

        if (!propertyId) {
          alert("Invalid property.");
          return;
        }

        await firebase
          .firestore()
          .collection("users")
          .doc(user.uid)
          .collection("savedProperties")
          .doc(propertyId)
          .set({
            savedAt: firebase.firestore.FieldValue.serverTimestamp(),
            propertyId: propertyId,
          });
        alert("Property saved successfully!");
      } catch (err) {
        console.error("Save property error:", err);
        alert("Failed to save property. Please try again.");
      }
    };

    window.messageLandlord = function (landlordId) {
      if (landlordId) {
        window.location.href = `/messages.html?to=${landlordId}`;
      } else {
        alert("Landlord information not available.");
      }
    };
  }); // Close Firebase auth state change listener
}); // Close first DOMContentLoaded

// Mobile menu functionality (separate DOMContentLoaded listener)
document.addEventListener("DOMContentLoaded", function () {
  const mobileMenuBtn = document.querySelector(".mobile-menu-btn");
  const mobileMenu = document.querySelector(".mobile-menu");
  const mobileMenuClose = document.querySelector(".mobile-menu-close");
  const body = document.body;

  // Only proceed if all elements exist
  if (!mobileMenuBtn || !mobileMenu || !mobileMenuClose) {
    console.warn("Mobile menu elements not found");
    return;
  }

  function openMobileMenu() {
    mobileMenu.style.display = "block";
    // Use requestAnimationFrame for better animation performance
    requestAnimationFrame(() => {
      mobileMenu.classList.add("active");
    });
    body.style.overflow = "hidden";
  }

  function closeMobileMenu() {
    mobileMenu.classList.remove("active");
    setTimeout(() => {
      mobileMenu.style.display = "none";
      body.style.overflow = "";
    }, 300);
  }

  mobileMenuBtn.addEventListener("click", openMobileMenu);
  mobileMenuClose.addEventListener("click", closeMobileMenu);

  // Close mobile menu when clicking outside
  mobileMenu.addEventListener("click", (e) => {
    if (e.target === mobileMenu) {
      closeMobileMenu();
    }
  });

  // Close mobile menu on escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && mobileMenu.classList.contains("active")) {
      closeMobileMenu();
    }
  });
});

// Handle iOS safe area insets and viewport height
function updateSafeAreaInsets() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty("--vh", `${vh}px`);
}

// Throttle resize events for better performance
let resizeTimeout;
function throttledUpdate() {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(updateSafeAreaInsets, 100);
}

window.addEventListener("resize", throttledUpdate);
window.addEventListener("orientationchange", () => {
  // Small delay for orientation change to complete
  setTimeout(updateSafeAreaInsets, 200);
});

// Initial call
updateSafeAreaInsets();
