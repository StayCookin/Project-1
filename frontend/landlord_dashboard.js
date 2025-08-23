// Fixed Landlord Dashboard JavaScript - Using Firebase v9+
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCZuEC4QU-RYxQbjWqBoxk6j1mbwwRtRBo",
  authDomain: "inrent-6ab14.firebaseapp.com",
  databaseURL: "https://inrent-6ab14-default-rtdb.firebaseio.com",
  projectId: "inrent-6ab14",
  storageBucket: "inrent-6ab14.firebasestorage.app",
  messagingSenderId: "327416190792",
  appId: "1:327416190792:web:970377ec8dcef557e5457d",
  measurementId: "G-JY9E760ZQ0"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", async function () {
  let currentUser = null;
  let landlordData = null;
  let properties = [];
  let analytics = {};

  // Initialize Firebase Auth listener
  onAuthStateChanged(auth, async function (user) {
    if (!user) {
      console.log("No authenticated user found");
      window.location.href = "index.html";
      return;
    }

    currentUser = user;
    await initializeDashboard(user);
  });

  async function initializeDashboard(user) {
    try {
      // Show loading state
      showLoadingState();

      // Fetch landlord profile from Firestore
      landlordData = await fetchLandlordProfile(user.uid);

      // Verify user is a landlord
      if (!landlordData || (landlordData.role !== "LANDLORD" && landlordData.userType !== "LANDLORD")) {
        alert("Access denied. Only landlords can access this page.");
        window.location.href = "index.html";
        return;
      }

      // Check verification status and handle restrictions
      handleVerificationStatus(landlordData);

      // Fetch properties and analytics
      properties = await fetchLandlordProperties(user.uid);
      analytics = calculateAnalytics(properties);

      // Populate dashboard
      populateWelcomeMessage(landlordData);
      populateAnalyticsCards(analytics);
      populatePropertyCards(properties);
      await fetchAndDisplayInquiries(user.uid);

      // Setup event listeners
      setupEventListeners();

      // Hide loading state
      hideLoadingState();
    } catch (error) {
      console.error("Error initializing dashboard:", error);
      showErrorState("Failed to load dashboard. Please refresh the page.");
    }
  }

  async function fetchLandlordProfile(userId) {
    try {
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        throw new Error("User profile not found");
      }

      return { id: userDoc.id, ...userDoc.data() };
    } catch (error) {
      console.error("Error fetching landlord profile:", error);
      throw error;
    }
  }

  async function fetchLandlordProperties(landlordId) {
    try {
      const propertiesRef = collection(db, "properties");
      const q = query(
        propertiesRef,
        where("landlordId", "==", landlordId),
        orderBy("createdAt", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      const propertiesList = [];
      
      querySnapshot.forEach((doc) => {
        propertiesList.push({ id: doc.id, ...doc.data() });
      });

      return propertiesList;
    } catch (error) {
      console.error("Error fetching properties:", error);
      return [];
    }
  }

  function calculateAnalytics(properties) {
    const totalProperties = properties.length;
    const totalRevenue = properties.reduce(
      (sum, prop) => sum + (prop.price || 0),
      0
    );
    const occupiedProperties = properties.filter(
      (prop) => prop.status === "occupied"
    ).length;
    const occupancyRate =
      totalProperties > 0
        ? Math.round((occupiedProperties / totalProperties) * 100)
        : 0;
    const totalSecurityFees = properties.reduce(
      (sum, prop) => sum + (prop.securityFee || 0),
      0
    );

    return {
      totalProperties,
      totalRevenue: `P${totalRevenue.toLocaleString()}`,
      occupancyRate: `${occupancyRate}%`,
      inrentFees: `P${totalSecurityFees.toLocaleString()}`,
    };
  }

  function handleVerificationStatus(landlordData) {
    const isVerified = landlordData.verificationStatus === "verified";
    const isInvalidLogin = landlordData.isInvalidLogin || false;
    const invalidLoginDate = landlordData.invalidLoginDate;

    if (isInvalidLogin && invalidLoginDate) {
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      const now = new Date().getTime();
      const loginDate = new Date(invalidLoginDate).getTime();
      const daysRemaining = Math.ceil(
        (loginDate + SEVEN_DAYS_MS - now) / (24 * 60 * 60 * 1000)
      );

      if (daysRemaining <= 0) {
        window.location.href = "index.html";
        return;
      }

      showVerificationWarning(daysRemaining);
      restrictDashboardFeatures();
    } else if (!isVerified) {
      showVerificationReminder();
    }
  }

  function showVerificationWarning(daysRemaining) {
    const warningBanner = document.createElement("div");
    warningBanner.className = "verification-warning";
    warningBanner.style.cssText = `
      background: #fff3cd;
      color: #856404;
      padding: 1rem;
      margin-bottom: 1rem;
      border-radius: 8px;
      border: 1px solid #ffeeba;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    warningBanner.innerHTML = `
      <div>
        <strong>Limited Access:</strong> Your account has limited functionality. 
        You have ${daysRemaining} days remaining to complete your verification.
      </div>
      <button onclick="window.location.href='verification.html'" 
              style="background: #856404; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">
        Complete Verification
      </button>
    `;

    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      mainContent.insertBefore(warningBanner, mainContent.firstChild);
    }
  }

  function showVerificationReminder() {
    const reminderBanner = document.createElement("div");
    reminderBanner.className = "verification-reminder";
    reminderBanner.style.cssText = `
      background: #d1ecf1;
      color: #0c5460;
      padding: 1rem;
      margin-bottom: 1rem;
      border-radius: 8px;
      border: 1px solid #bee5eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    reminderBanner.innerHTML = `
      <div>
        <strong>Verification Pending:</strong> Complete your verification to unlock all features.
      </div>
      <button onclick="window.location.href='verification.html'" 
              style="background: #0c5460; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">
        Verify Account
      </button>
    `;

    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      mainContent.insertBefore(reminderBanner, mainContent.firstChild);
    }
  }

  function restrictDashboardFeatures() {
    const restrictedFeatures = [
      "List New Property",
      "View Applications",
      "Messages",
      "Reviews",
      "Analytics",
    ];

    // Disable dashboard cards
    document.querySelectorAll(".dashboard-card").forEach((card) => {
      const title = card.querySelector("h3")?.textContent?.trim();
      if (restrictedFeatures.includes(title)) {
        card.style.opacity = "0.5";
        card.style.cursor = "not-allowed";
        card.style.pointerEvents = "none";
      }
    });

    // Disable property actions
    document.querySelectorAll(".property-actions .btn").forEach((btn) => {
      btn.style.opacity = "0.5";
      btn.style.pointerEvents = "none";
    });
  }

  function populateWelcomeMessage(landlordData) {
    const welcomeHeader = document.querySelector(".welcome-section h1");
    if (welcomeHeader && landlordData.name) {
      welcomeHeader.textContent = `Welcome, ${landlordData.name}`;
    }
  }

  function populateAnalyticsCards(analytics) {
    const updateElement = (id, value) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value || "0";
      }
    };

    updateElement("totalPropertiesValue", analytics.totalProperties);
    updateElement("totalRevenueValue", analytics.totalRevenue);
    updateElement("occupancyRateValue", analytics.occupancyRate);
    updateElement("inrentFeesValue", analytics.inrentFees);
  }

  function populatePropertyCards(properties) {
    const propertyList = document.getElementById("propertyList");
    if (!propertyList) return;

    if (!Array.isArray(properties) || properties.length === 0) {
      propertyList.innerHTML = `
        <div class="no-properties">
          <h3>No Properties Yet</h3>
          <p>Add your first property to get started!</p>
          <button class="btn-primary" onclick="openAddPropertyModal()">Add Property</button>
        </div>
      `;
      return;
    }

    propertyList.innerHTML = properties
      .map(
        (prop) => `
      <div class="property-card" data-property-id="${prop.id}">
        <div class="property-image">
          ${
            prop.imageUrl
              ? `<img src="${prop.imageUrl}" alt="${prop.title}" style="width: 100%; height: 150px; object-fit: cover;">`
              : `<div style="width: 100%; height: 150px; background: #f0f0f0; display: flex; align-items: center; justify-content: center;">📷 No Image</div>`
          }
        </div>
        <div class="property-content">
          <div class="property-title">${prop.title || "Untitled Property"}</div>
          <div class="property-details">${
            prop.location || "Location not specified"
          }</div>
          <div class="property-price">P${
            prop.price ? prop.price.toLocaleString() : "Price not set"
          }</div>
          <div class="property-status ${prop.status || "available"}">${
          prop.status || "Available"
        }</div>
          <div class="property-actions">
            <button class="btn-primary" onclick="editProperty('${
              prop.id
            }')">Edit</button>
            <button class="btn-secondary" onclick="viewPropertyAnalytics('${
              prop.id
            }')">Analytics</button>
            <button class="btn-danger" onclick="deleteProperty('${prop.id}', '${
          prop.title
        }')">Delete</button>
          </div>
        </div>
      </div>
    `
      )
      .join("");
  }

  async function fetchAndDisplayInquiries(landlordId) {
    try {
      const inquiriesRef = collection(db, "inquiries");
      const q = query(
        inquiriesRef,
        where("landlordId", "==", landlordId),
        orderBy("createdAt", "desc"),
        limit(10)
      );
      
      const querySnapshot = await getDocs(q);
      const inquiries = [];
      
      querySnapshot.forEach((doc) => {
        inquiries.push({ id: doc.id, ...doc.data() });
      });

      displayInquiries(inquiries);
    } catch (error) {
      console.error("Error fetching inquiries:", error);
      displayInquiries([]);
    }
  }

  function displayInquiries(inquiries) {
    let inquiriesSection = document.querySelector(
      ".landlord-inquiries-section"
    );

    if (!inquiriesSection) {
      inquiriesSection = document.createElement("section");
      inquiriesSection.className = "landlord-inquiries-section";
      inquiriesSection.style.marginTop = "2rem";

      const mainContent =
        document.querySelector(".main-content") || document.body;
      mainContent.appendChild(inquiriesSection);
    }

    inquiriesSection.innerHTML = `
      <h2>Recent Property Inquiries</h2>
      <div id="landlord-inquiries-list">
        ${
          inquiries.length === 0
            ? "<p>No inquiries received yet.</p>"
            : inquiries
                .map(
                  (inq) => `
              <div class="inquiry-item" style="border:1px solid #eee;padding:1rem;margin-bottom:1rem;border-radius:8px;">
                <div><b>From:</b> ${inq.studentName || "Student"}</div>
                <div><b>Property:</b> ${inq.propertyTitle || "Property"}</div>
                <div><b>Message:</b> ${inq.message || "No message"}</div>
                <div><b>Date:</b> ${
                  inq.createdAt && inq.createdAt.toDate
                    ? new Date(inq.createdAt.toDate()).toLocaleString()
                    : inq.createdAt
                    ? new Date(inq.createdAt).toLocaleString()
                    : "Unknown date"
                }</div>
                <div><b>Contact:</b> ${
                  inq.studentEmail || "No email provided"
                }</div>
              </div>
            `
                )
                .join("")
        }
      </div>
    `;
  }

  function setupEventListeners() {
    // Logout functionality
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async function (e) {
        e.preventDefault();
        if (confirm("Are you sure you want to logout?")) {
          try {
            await signOut(auth);
            window.location.href = "index.html";
          } catch (error) {
            console.error("Logout error:", error);
            alert("Error logging out. Please try again.");
          }
        }
      });
    }

    // Add property button
    const addPropertyBtn = document.querySelector(
      ".quick-actions .btn-primary"
    );
    if (addPropertyBtn) {
      addPropertyBtn.addEventListener("click", function () {
        window.location.href = "add-property.html";
      });
    }

    // Navigation buttons
    const dashboardBtn = document.getElementById("dashboardBtn");
    if (dashboardBtn) {
      dashboardBtn.addEventListener("click", function() {
        window.location.href = "landlord-dashboard.html";
      });
    }

    const messagesBtn = document.getElementById("messagesBtnHeader");
    if (messagesBtn) {
      messagesBtn.addEventListener("click", function() {
        window.location.href = "messages.html";
      });
    }
  }

  // Global functions for property management
  window.editProperty = function (propertyId) {
    window.location.href = `edit-property.html?id=${propertyId}`;
  };

  window.viewPropertyAnalytics = function (propertyId) {
    window.location.href = `property-analytics.html?id=${propertyId}`;
  };

  window.deleteProperty = async function (propertyId, propertyTitle) {
    if (
      !confirm(
        `Are you sure you want to delete "${propertyTitle}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const propertyRef = doc(db, "properties", propertyId);
      await deleteDoc(propertyRef);

      alert("Property deleted successfully!");

      // Refresh the dashboard
      if (currentUser) {
        await initializeDashboard(currentUser);
      }
    } catch (error) {
      console.error("Error deleting property:", error);
      alert("Failed to delete property. Please try again.");
    }
  };

  window.openAddPropertyModal = function () {
    window.location.href = "add-property.html";
  };

  // Utility functions
  function showLoadingState() {
    const loadingDiv = document.createElement("div");
    loadingDiv.id = "dashboard-loading";
    loadingDiv.innerHTML = `
      <div style="text-align: center; padding: 2rem;">
        <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #228B22; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <p style="margin-top: 1rem;">Loading dashboard...</p>
      </div>
    `;

    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      mainContent.appendChild(loadingDiv);
    }
  }

  function hideLoadingState() {
    const loadingDiv = document.getElementById("dashboard-loading");
    if (loadingDiv) {
      loadingDiv.remove();
    }
  }

  function showErrorState(message) {
    const errorDiv = document.createElement("div");
    errorDiv.innerHTML = `
      <div style="background: #f8d7da; color: #721c24; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
        <strong>Error:</strong> ${message}
        <button onclick="location.reload()" style="margin-left: 1rem; padding: 0.5rem 1rem; background: #721c24; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Retry
        </button>
      </div>
    `;

    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      mainContent.appendChild(errorDiv);
    }
  }

  // Add CSS for loading animation
  const style = document.createElement("style");
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
});