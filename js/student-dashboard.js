// js/student-dashboard.js
// Handles dynamic data population for the student dashboard

document.addEventListener("DOMContentLoaded", () => {
  fetchUserProfile();
  fetchDashboardStats();
  fetchProperties();
  fetchReviews();
  // Optionally: fetchNotifications();
});

async function fetchUserProfile() {
  try {
    const res = await fetch("/api/profile");
    if (!res.ok) throw new Error("Failed to fetch profile");
    const profile = await res.json();
    // Update sidebar and header profile image and name
    document
      .querySelectorAll(".profile-image")
      .forEach(
        (img) => (img.src = profile.photoUrl || "/img/default-profile.png")
      );
    document
      .querySelectorAll(".profile-image-small")
      .forEach(
        (img) => (img.src = profile.photoUrl || "/img/default-profile.png")
      );
    document
      .querySelectorAll(".sidebar-header h2")
      .forEach((h2) => (h2.textContent = `Welcome, ${profile.firstName}`));
  } catch (err) {
    console.error("Profile fetch error:", err);
  }
}

async function fetchDashboardStats() {
  try {
    // Optionally, fetch stats from a dedicated endpoint, or aggregate from other endpoints
    const [propertiesRes, reviewsRes] = await Promise.all([
      fetch("/api/properties"),
      fetch("/api/reviews"),
    ]);
    const properties = propertiesRes.ok ? await propertiesRes.json() : [];
    const reviews = reviewsRes.ok ? await reviewsRes.json() : [];
    // Update dashboard cards
    document.querySelector(".dashboard-card:nth-child(1) p").textContent =
      properties.filter((p) => p.saved).length;
    document.querySelector(".dashboard-card:nth-child(2) p").textContent =
      properties.filter((p) => p.scheduledViewing).length;
    document.querySelector(".dashboard-card:nth-child(3) p").textContent = "5"; // TODO: Replace with real messages count
    document.querySelector(".dashboard-card:nth-child(4) p").textContent =
      reviews.length;
  } catch (err) {
    console.error("Dashboard stats error:", err);
  }
}

async function fetchProperties() {
  try {
    const res = await fetch("/api/properties");
    if (!res.ok) throw new Error("Failed to fetch properties");
    const properties = await res.json();
    const grid = document.querySelector(".property-grid");
    grid.innerHTML = "";
    if (properties.length === 0) {
      grid.innerHTML = '<div class="empty-state">No properties found.</div>';
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
          <div>
            <div class="property-price">P${property.price}/month</div>
            <h3 class="property-title">${property.title}</h3>
            <p class="property-location">${property.location}</p>
            <div class="property-features">
              <span><i class="fas fa-bed"></i> ${property.beds} Beds</span>
              <span><i class="fas fa-bath"></i> ${property.baths} Bath${
        property.baths > 1 ? "s" : ""
      }</span>
              <span><i class="fas fa-ruler-combined"></i> ${
                property.size
              } sqft</span>
            </div>
          </div>
          <div class="property-actions">
            <button class="btn btn-primary"><i class="fas fa-eye"></i> View Details</button>
            <button class="btn btn-secondary"><i class="fas fa-heart"></i> Save</button>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });
  } catch (err) {
    console.error("Properties fetch error:", err);
    document.querySelector(".property-grid").innerHTML =
      '<div class="empty-state">Failed to load properties.</div>';
  }
}

async function fetchReviews() {
  try {
    const res = await fetch("/api/reviews");
    if (!res.ok) throw new Error("Failed to fetch reviews");
    const reviews = await res.json();
    // Optionally, render reviews in a section or modal
    // For now, just update the dashboard card count (handled in fetchDashboardStats)
  } catch (err) {
    console.error("Reviews fetch error:", err);
  }
}

// Optionally, implement fetchNotifications() if backend supports it
