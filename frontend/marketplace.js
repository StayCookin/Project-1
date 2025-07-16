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
    } catch {}

    // Update navigation based on user type
    const navLinks = document.querySelector(".nav-links");
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

    // Handle logout
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async function (e) {
        e.preventDefault();
        if (confirm("Are you sure you want to logout?")) {
          await firebase.auth().signOut();
          window.location.href = "index.html";
        }
      });
    }

    // Fetch and render properties from Firestore
    fetchProperties();

    // Handle search and filter changes
    const searchBtn = document.querySelector(".btn-primary");
    const filterSelects = document.querySelectorAll("select");
    searchBtn.addEventListener("click", function () {
      const filters = {};
      filterSelects.forEach((select) => {
        filters[select.id] = select.value;
      });
      fetchProperties(filters);
    });

    async function fetchProperties(filters = {}) {
      try {
        let query = firebase.firestore().collection("properties");
        // Apply filters (simple example, expand as needed)
        if (filters.location)
          query = query.where("location", "==", filters.location);
        if (filters.type) query = query.where("type", "==", filters.type);
        if (filters.price) {
          // Example: price range filter
          if (filters.price === "0-2000")
            query = query.where("price", ">=", 0).where("price", "<=", 2000);
          else if (filters.price === "2000-4000")
            query = query.where("price", ">=", 2000).where("price", "<=", 4000);
          else if (filters.price === "4000-6000")
            query = query.where("price", ">=", 4000).where("price", "<=", 6000);
          else if (filters.price === "6000+")
            query = query.where("price", ">=", 6000);
        }
        // Add more filters as needed
        const snapshot = await query.get();
        const properties = snapshot.docs.map((doc) => ({
          _id: doc.id,
          ...doc.data(),
        }));
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

    window.saveProperty = async function (propertyId) {
      try {
        // Save property for user in Firestore (e.g., users/{uid}/savedProperties)
        const user = firebase.auth().currentUser;
        if (!user) throw new Error("Not authenticated");
        await firebase
          .firestore()
          .collection("users")
          .doc(user.uid)
          .collection("savedProperties")
          .doc(propertyId)
          .set({ savedAt: firebase.firestore.FieldValue.serverTimestamp() });
        alert("Property saved!");
      } catch (err) {
        alert("Failed to save.");
      }
    };

    window.messageLandlord = function (landlordId) {
      window.location.href = `/messages.html?to=${landlordId}`;
    };
  }); // <-- Close main DOMContentLoaded

// Mobile menu functionality (IDs/classes assumed consistent with marketplace.html)
document.addEventListener("DOMContentLoaded", function () {
  const mobileMenuBtn = document.querySelector(".mobile-menu-btn");
  const mobileMenu = document.querySelector(".mobile-menu");
  const mobileMenuClose = document.querySelector(".mobile-menu-close");
  const body = document.body;

  if (!mobileMenuBtn || !mobileMenu || !mobileMenuClose) return;

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
