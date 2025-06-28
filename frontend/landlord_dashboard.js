document.addEventListener("DOMContentLoaded", async function () {
  // Fetch landlord profile and properties from backend
  let landlord = null;
  let properties = [];
  let analytics = {};
  try {
    const profileRes = await fetch("/api/profile/landlord", {
      credentials: "include",
    });
    if (profileRes.ok) {
      landlord = await profileRes.json();
      // Set welcome message
      const welcomeHeader = document.querySelector(".welcome-section h1");
      if (welcomeHeader && landlord.name) {
        welcomeHeader.textContent = `Welcome, ${landlord.name}`;
      }
    }
    const propsRes = await fetch("/api/properties/landlord", {
      credentials: "include",
    });
    if (propsRes.ok) {
      properties = await propsRes.json();
    }
    const analyticsRes = await fetch("/api/properties/landlord/analytics", {
      credentials: "include",
    });
    if (analyticsRes.ok) {
      analytics = await analyticsRes.json();
    }
  } catch (err) {
    // Show error or redirect
  }

  // Populate analytics cards
  if (analytics) {
    document.getElementById("totalPropertiesValue").textContent =
      analytics.totalProperties || 0;
    document.getElementById("totalRevenueValue").textContent =
      analytics.totalRevenue || "P0";
    document.getElementById("occupancyRateValue").textContent =
      analytics.occupancyRate ? analytics.occupancyRate + "%" : "0%";
    document.getElementById("inrentFeesValue").textContent =
      analytics.inrentFees || "P0";
  }

  // Populate property cards
  const propertyList = document.getElementById("propertyList");
  if (propertyList && Array.isArray(properties)) {
    propertyList.innerHTML = properties
      .map(
        (prop) => `
      <div class="property-card">
        <div class="property-title">${prop.title}</div>
        <div class="property-details">${prop.details}</div>
        <div class="property-price">P${prop.price}</div>
        <button class="btn-primary" data-id="${prop.id}">Edit</button>
        <button class="btn-secondary" data-id="${prop.id}">Analytics</button>
      </div>
    `
      )
      .join("");
  }

  // Logout
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async function (e) {
      e.preventDefault();
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      window.location.href = "/index.html";
    });
  }

  // Check if user is authenticated
  if (!window.currentUser) {
    // Redirect to landing page if not authenticated
    window.location.href = "index.html";
    return;
  }

  // Check for invalid login status
  const isInvalidLogin = window.currentUser.isInvalidLogin || false;
  const invalidLoginDate = window.currentUser.invalidLoginDate || null;
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  if (isInvalidLogin) {
    // Check if 7 days have passed
    const now = new Date().getTime();
    const loginDate = new Date(invalidLoginDate).getTime();
    const daysRemaining = Math.ceil(
      (loginDate + SEVEN_DAYS_MS - now) / (24 * 60 * 60 * 1000)
    );

    if (daysRemaining <= 0) {
      // Time limit expired, redirect to landing page
      window.location.href = "index.html";
      return;
    }

    // Add warning banner
    const warningBanner = document.createElement("div");
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
    document
      .querySelector(".main-content")
      .insertBefore(warningBanner, document.querySelector(".dashboard-header"));

    // Disable restricted functionality
    const restrictedFeatures = [
      "List New Property",
      "View Applications",
      "Messages",
      "Reviews",
      "Analytics",
    ];

    // Disable dashboard cards
    document.querySelectorAll(".dashboard-card").forEach((card) => {
      const title = card.querySelector("h3").textContent.trim();
      if (restrictedFeatures.includes(title)) {
        card.style.opacity = "0.5";
        card.style.cursor = "not-allowed";
        card.style.pointerEvents = "none";
      }
    });

    // Disable sidebar menu items
    document.querySelectorAll(".sidebar-menu a").forEach((link) => {
      const text = link.textContent.trim();
      if (restrictedFeatures.some((feature) => text.includes(feature))) {
        link.style.opacity = "0.5";
        link.style.pointerEvents = "none";
      }
    });

    // Disable property management actions
    document.querySelectorAll(".property-actions .btn").forEach((btn) => {
      btn.style.opacity = "0.5";
      btn.style.pointerEvents = "none";
    });
  }

  // Handle property card actions
  const propertyCards = document.querySelectorAll(".property-card");
  propertyCards.forEach((card) => {
    const editBtn = card.querySelector(".btn-primary");
    const analyticsBtn = card.querySelector(".btn-secondary");

    editBtn.addEventListener("click", function () {
      const propertyTitle = card.querySelector(".property-title").textContent;
      alert(`Editing property: ${propertyTitle}`);
    });

    analyticsBtn.addEventListener("click", function () {
      const propertyTitle = card.querySelector(".property-title").textContent;
      alert(`Viewing analytics for: ${propertyTitle}`);
    });
  });

  // Message box functionality
  const messageBox = document.querySelector(".message-box");
  const closeMessageBtn = document.querySelector(".close-message");

  function showMessageBox() {
    messageBox.style.display = "block";
  }

  closeMessageBtn.addEventListener("click", function () {
    messageBox.style.display = "none";
  });

  // Property creation popup functionality
  const popupOverlay = document.querySelector(".popup-overlay");
  const closePopupBtn = document.querySelector(".close-popup");
  const addPropertyBtn = document.querySelector(".quick-actions .btn-primary");
  const propertyForm = document.getElementById("propertyForm");
  const promoteBtn = document.querySelector(".promotion-section .btn-primary");

  addPropertyBtn.addEventListener("click", function () {
    popupOverlay.style.display = "flex";
  });

  closePopupBtn.addEventListener("click", function () {
    popupOverlay.style.display = "none";
  });

  // Handle property type change
  const propertyTypeRadios = document.querySelectorAll(
    'input[name="propertyType"]'
  );
  const sharedOptions = document.querySelector(".shared-options");

  propertyTypeRadios.forEach((radio) => {
    radio.addEventListener("change", function () {
      if (this.value === "shared") {
        sharedOptions.style.display = "block";
      } else {
        sharedOptions.style.display = "none";
      }
    });
  });

  // Update property form submission
  propertyForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const propertyType = document.querySelector(
      'input[name="propertyType"]:checked'
    ).value;
    const propertyData = {
      title: document.getElementById("propertyTitle").value,
      details: document.getElementById("propertyDetails").value,
      type: propertyType,
      amenities: Array.from(
        document.querySelectorAll(
          '.checkbox-group input[type="checkbox"]:checked'
        )
      ).map((checkbox) => checkbox.id),
      location: Array.from(
        document.querySelectorAll(
          '.checkbox-group input[type="checkbox"]:checked'
        )
      ).map((checkbox) => checkbox.id),
      price: document.getElementById("propertyPrice").value,
    };

    if (propertyType === "shared") {
      propertyData.totalRooms = document.getElementById("totalRooms").value;
      propertyData.availableRooms =
        document.getElementById("availableRooms").value;
      propertyData.sharedSpaces = Array.from(
        document.querySelectorAll(
          '.shared-options input[type="checkbox"]:checked'
        )
      ).map((checkbox) => checkbox.id);
    }

    console.log("Property Data:", propertyData);
    alert("Property added successfully!");
    popupOverlay.style.display = "none";
    propertyForm.reset();
  });

  promoteBtn.addEventListener("click", function () {
    alert("Property promotion feature coming soon!");
  });

  // Resend verification email
  window.resendVerificationEmail = function () {
    // In a real application, this would be an API call
    alert("Verification email has been resent. Please check your inbox.");
  };

  // Contact support
  window.contactSupport = function () {
    window.location.href = "contact-support.html";
  };

  // Initialize verification status
  checkVerificationStatus();

  // Handle verification link in URL
  const urlParams = new URLSearchParams(window.location.search);
  const verificationToken = urlParams.get("verify");
  if (verificationToken) {
    // In a real application, this would be an API call to verify the token
    console.log("Verifying token:", verificationToken);
    // Simulate successful verification
    window.currentUser.verificationStatus = "verification-success";
    updateVerificationStatus("verification-success");

    // Remove the token from URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  // Sidebar navigation logic
  document.querySelectorAll(".sidebar-menu a").forEach((link) => {
    link.addEventListener("click", function (e) {
      if (this.getAttribute("href") === "#logout") {
        e.preventDefault();
        if (confirm("Are you sure you want to logout?")) {
          window.location.href = "index.html";
        }
      } else if (this.getAttribute("href") === "#add-property") {
        e.preventDefault();
        document.querySelector(".popup-overlay").style.display = "flex";
      } else {
        // Highlight active
        document
          .querySelectorAll(".sidebar-menu a")
          .forEach((l) => l.classList.remove("active"));
        this.classList.add("active");
        // Optionally scroll to section or handle navigation
      }
    });
  });

  function handleLandlordImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size should be less than 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = function (e) {
      document.getElementById("profileImage").src = e.target.result;
      document.getElementById("removeProfileImage").style.display = "block";
      // Save to landlordData in localStorage
      let landlordData = JSON.parse(localStorage.getItem("landlordData")) || {};
      landlordData.profileImage = e.target.result;
      localStorage.setItem("landlordData", JSON.stringify(landlordData));
    };
    reader.readAsDataURL(file);
  }

  document
    .getElementById("removeProfileImage")
    .addEventListener("click", function () {
      document.getElementById("profileImage").src =
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80";
      this.style.display = "none";
      let landlordData = JSON.parse(localStorage.getItem("landlordData")) || {};
      delete landlordData.profileImage;
      localStorage.setItem("landlordData", JSON.stringify(landlordData));
    });

  document.addEventListener("DOMContentLoaded", function () {
    let landlordData = JSON.parse(localStorage.getItem("landlordData")) || {};
    if (landlordData.profileImage) {
      document.getElementById("profileImage").src = landlordData.profileImage;
      document.getElementById("removeProfileImage").style.display = "block";
    }
    // Blank analytics cards if no properties
    if (!landlordData.properties || landlordData.properties.length === 0) {
      document.getElementById("totalPropertiesValue").textContent = "";
      document.getElementById("totalPropertiesTrend").textContent = "";
      document.getElementById("totalRevenueValue").textContent = "";
      document.getElementById("totalRevenueTrend").textContent = "";
      document.getElementById("occupancyRateValue").textContent = "";
      document.getElementById("occupancyRateTrend").textContent = "";
      document.getElementById("inrentFeesValue").textContent = "";
      document.getElementById("inrentFeesTrend").textContent = "";
    }
  });

  // Add a section to display landlord inquiries
  const dashboardMain =
    document.querySelector(".main-content") || document.body;
  const inquiriesSection = document.createElement("section");
  inquiriesSection.className = "landlord-inquiries-section";
  inquiriesSection.innerHTML = `
    <h2 style="margin-top:2rem;">Property Inquiries</h2>
    <div id="landlord-inquiries-list">Loading...</div>
  `;
  dashboardMain.appendChild(inquiriesSection);

  async function fetchLandlordInquiries() {
    const token = localStorage.getItem("authToken");
    if (!token) {
      document.getElementById("landlord-inquiries-list").textContent =
        "You must be logged in to view inquiries.";
      return;
    }
    try {
      const res = await fetch("/api/inquiries/landlord", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch inquiries");
      const inquiries = await res.json();
      if (!Array.isArray(inquiries) || inquiries.length === 0) {
        document.getElementById("landlord-inquiries-list").textContent =
          "No inquiries received yet.";
        return;
      }
      document.getElementById("landlord-inquiries-list").innerHTML = inquiries
        .map(
          (inq) => `
        <div class="inquiry-item" style="border:1px solid #eee;padding:1rem;margin-bottom:1rem;border-radius:8px;">
          <div><b>From:</b> ${inq.student?.firstName || "Student"} ${
            inq.student?.lastName || ""
          }</div>
          <div><b>Property:</b> ${inq.property?.title || inq.propertyId}</div>
          <div><b>Message:</b> ${inq.message}</div>
          <div><b>Date:</b> ${new Date(inq.createdAt).toLocaleString()}</div>
        </div>
      `
        )
        .join("");
    } catch (err) {
      document.getElementById("landlord-inquiries-list").textContent =
        "Error loading inquiries.";
    }
  }

  fetchLandlordInquiries();
});
