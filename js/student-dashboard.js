// student-dashboard.js
// Handles dynamic dashboard rendering for student user

document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Elements ---
  const sidebarWelcome = document.getElementById("sidebarWelcome");
  const dashboardCards = document.getElementById("dashboardCards");
  const propertyGrid = document.getElementById("propertyGrid");
  const notificationBadge = document.getElementById("notificationBadge");
  const notificationList = document.getElementById("notificationList");

  // --- Fetch and Render User Profile ---
  async function fetchUserProfile() {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) return;
      const user = await res.json();
      if (user && user.name) {
        sidebarWelcome.textContent = `Welcome, ${user.name}`;
      }
    } catch {}
  }

  // --- Fetch and Render Dashboard Stats ---
  async function fetchDashboardStats() {
    // Fetch saved properties, viewings, messages
    const [saved, viewings, messages] = await Promise.all([
      fetch("/api/saved-properties", { credentials: "include" }).then((r) =>
        r.ok ? r.json() : []
      ),
      fetch("/api/viewings", { credentials: "include" }).then((r) =>
        r.ok ? r.json() : []
      ),
      fetch("/api/messages/conversations", { credentials: "include" }).then(
        (r) => (r.ok ? r.json() : [])
      ),
    ]);
    dashboardCards.innerHTML = `
      <div class="dashboard-card">
        <h3><i class="fas fa-heart"></i> Saved Properties</h3>
        <p>${saved.length}</p>
      </div>
      <div class="dashboard-card">
        <h3><i class="fas fa-calendar"></i> Scheduled Viewings</h3>
        <p>${viewings.length}</p>
      </div>
      <div class="dashboard-card">
        <h3><i class="fas fa-envelope"></i> Messages</h3>
        <p>${messages.length}</p>
      </div>
    `;
  }

  // --- Fetch and Render Properties ---
  async function fetchProperties() {
    try {
      const res = await fetch("/api/properties?isAvailable=true", {
        credentials: "include",
      });
      if (!res.ok) return;
      const properties = await res.json();
      propertyGrid.innerHTML = properties
        .map(
          (property) => `
        <div class="property-card">
          <img src="${
            property.images && property.images[0]
              ? property.images[0].url
              : "https://via.placeholder.com/300x200"
          }" alt="${property.title}" class="property-image" />
          <div class="property-details">
            <div>
              <div class="property-price">P${
                property.rentAmount || property.price
              }/month</div>
              <h3 class="property-title">${property.title}</h3>
              <p class="property-location">${
                property.location || property.address?.city || ""
              }</p>
              <div class="property-features">
                <span><i class="fas fa-bed"></i> ${
                  property.features?.bedrooms || "-"
                } Beds</span>
                <span><i class="fas fa-bath"></i> ${
                  property.features?.bathrooms || "-"
                } Bath</span>
                <span><i class="fas fa-ruler-combined"></i> ${
                  property.features?.area || "-"
                } sqft</span>
              </div>
            </div>
            <div class="property-actions">
              <button class="btn btn-primary" onclick="window.location.href='property-details.html?id=${
                property._id || property.id
              }'">
                <i class="fas fa-eye"></i> View Details
              </button>
              <button class="btn btn-secondary save-btn" data-id="${
                property._id || property.id
              }">
                <i class="fas fa-heart"></i> Save
              </button>
            </div>
          </div>
        </div>
      `
        )
        .join("");
      // Attach save button listeners
      document.querySelectorAll(".save-btn").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          e.preventDefault();
          const id = btn.getAttribute("data-id");
          await fetch("/api/saved-properties", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ propertyId: id }),
          });
          fetchDashboardStats();
        });
      });
    } catch {}
  }

  // --- Fetch and Render Notifications ---
  async function fetchNotifications() {
    // For demo: fetch unread messages and viewings
    const [messages, viewings] = await Promise.all([
      fetch("/api/messages/conversations", { credentials: "include" }).then(
        (r) => (r.ok ? r.json() : [])
      ),
      fetch("/api/viewings", { credentials: "include" }).then((r) =>
        r.ok ? r.json() : []
      ),
    ]);
    let unread = messages.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
    notificationBadge.textContent = unread;
    notificationList.innerHTML = "";
    if (unread > 0) {
      messages.forEach((c) => {
        if (c.unreadCount > 0) {
          notificationList.innerHTML += `<div class='notification-item'><div class='title'>New Message</div><div class='message'>${
            c.lastMessage?.text || "You have a new message."
          }</div><div class='time'>${new Date(
            c.lastMessage?.createdAt
          ).toLocaleString()}</div></div>`;
        }
      });
    }
    // Add viewing reminders
    viewings.forEach((v) => {
      if (v.status === "approved") {
        notificationList.innerHTML += `<div class='notification-item'><div class='title'>Viewing Reminder</div><div class='message'>You have a viewing at ${new Date(
          v.scheduledDate
        ).toLocaleString()}</div></div>`;
      }
    });
  }

  // --- Logout ---
  document.getElementById("logoutBtn")?.addEventListener("click", async (e) => {
    e.preventDefault();
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/login.html";
  });
  document
    .getElementById("headerLogoutBtn")
    ?.addEventListener("click", async (e) => {
      e.preventDefault();
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      window.location.href = "/login.html";
    });

  // --- Initial load ---
  fetchUserProfile();
  fetchDashboardStats();
  fetchProperties();
  fetchNotifications();

  // Optionally, poll notifications every 60s
  setInterval(fetchNotifications, 60000);
});
