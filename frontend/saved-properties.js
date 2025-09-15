// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

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


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// Student User Flow: Login > Marketplace > View Property > Save/Book > Saved Properties Page
document.addEventListener("DOMContentLoaded", function () {
  // Check authentication - ensure only students can access saved properties
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      // Redirect to login if user is not authenticated
      window.location.href = "index.html";
      return;
    }

    // Verify user is a student
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userRole = userData.role || userData.userType || "STUDENT";

        if (userRole !== "STUDENT") {
          // Redirect non-students to appropriate dashboard
          window.location.href = userRole === "LANDLORD" ? "landlord-dashboard.html" : "index.html";
          return;
        }
      }
    } catch (error) {
      console.error("Error checking user role:", error);
    }

    // User is authenticated student, fetch their saved properties
    fetchSavedProperties();
  });
});

async function fetchSavedProperties() {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("Student not authenticated");
    }

    // Show loading state
    const grid = document.getElementById("savedPropertiesGrid");
    if (grid) {
      grid.innerHTML = `
        <div class="loading-state" style="text-align: center; padding: 2rem; grid-column: 1 / -1;">
          <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #228B22; margin-bottom: 1rem;"></i>
          <p>Loading your saved properties...</p>
        </div>
      `;
    }

    // Get saved properties from student's subcollection
    // Path: savedProperties/{propertyId}
    const savedPropertiesRef = collection(db,"savedProperties");
    const savedQuery = query(savedPropertiesRef,where("studentId","==", user.uid), orderBy("createdAt", "desc"));
    const savedSnapshot = await getDocs(savedQuery);

    if (savedSnapshot.empty) {
      renderSavedProperties([]);
      return;
    }

    // Fetch actual property details for each saved property
    const properties = [];
    const propertyPromises = [];

    savedSnapshot.docs.forEach((savedDoc) => {
      const savedData = savedDoc.data();
      const propertyId = savedData.propertyId;

      // Create promise to fetch property details
      const propertyPromise = getDoc(doc(db, "properties", propertyId))
        .then((propertyDoc) => {
          if (propertyDoc.exists()) {
            const propertyData = propertyDoc.data();
            return {
              _id: propertyId,
              savedAt: savedData.savedAt,
              ...propertyData
            };
          } else {
            // Property no longer exists, clean up the saved reference
            console.warn(`Property ${propertyId} no longer exists, removing from saved`);
            deleteDoc(doc(db, "users", user.uid, "savedProperties", propertyId));
            return null;
          }
        })
        .catch((error) => {
          console.error(`Error fetching property ${propertyId}:`, error);
          return null;
        });

      propertyPromises.push(propertyPromise);
    });

    // Wait for all property details to be fetched
    const propertyResults = await Promise.all(propertyPromises);

    // Filter out null results (properties that don't exist or failed to fetch)
    const validProperties = propertyResults.filter(property => property !== null);

    renderSavedProperties(validProperties);
  } catch (err) {
    console.error("Error fetching saved properties:", err);
    const grid = document.getElementById("savedPropertiesGrid");
    if (grid) {
      grid.innerHTML = `
        <div class="error-state" style="text-align: center; padding: 2rem; grid-column: 1 / -1;">
          <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: #e74c3c; margin-bottom: 1rem;"></i>
          <p>Failed to load your saved properties. Please try again.</p>
          <button class="btn" onclick="location.reload()" style="margin-top: 1rem; background: #228B22; color: white; border: none; padding: 0.5rem 1rem; border-radius: 5px; cursor: pointer;">Retry</button>
        </div>
      `;
    }
  }
}

function renderSavedProperties(properties) {
  const grid = document.getElementById("savedPropertiesGrid");
  if (!grid) {
    console.error("savedPropertiesGrid element not found");
    return;
  }

  grid.innerHTML = "";

  if (!properties.length) {
    grid.innerHTML = `
      <div class="empty-state" style="text-align: center; padding: 3rem; grid-column: 1 / -1;">
        <i class="fas fa-heart" style="font-size: 3rem; color: #bdc3c7; margin-bottom: 1rem;"></i>
        <h3 style="color: #7f8c8d; margin-bottom: 0.5rem;">No saved properties yet</h3>
        <p style="color: #95a5a6; margin-bottom: 1.5rem;">Start Browse properties in the marketplace and save the ones you like!</p>
        <a href="marketplace.html" class="btn" style="display: inline-block; background: #228B22; color: white; padding: 0.75rem 1.5rem; text-decoration: none; border-radius: 5px; font-weight: 500;">
          <i class="fas fa-search"></i> Browse Marketplace
        </a>
      </div>
    `;
    return;
  }

  properties.forEach((property) => {
    const card = document.createElement("div");
    card.className = "property-card";

    // Handle different possible image field names and ensure fallback
    const imageUrl = property.imageUrl ||
                    (property.images && property.images[0]) ||
                    "https://placehold.co/400x300/e8f5e9/228b22?text=Property+Image";
    const title = property.title || "Property Title";
    const price = property.price || 0;
    const location = property.location || "Location not specified";
    const beds = property.beds || property.bedrooms || 0;
    const baths = property.baths || property.bathrooms || 0;
    const size = property.size || property.squareFootage || "N/A";

    card.innerHTML = `
      <img src="${imageUrl}" alt="${title}" class="property-image"
           onerror="this.src='https://placehold.co/400x300/e8f5e9/228b22?text=Property+Image'" />
      <div class="property-details">
        <div class="property-price">P${price.toLocaleString()}/month</div>
        <h3 class="property-title">${title}</h3>
        <p class="property-location"><i class="fas fa-map-marker-alt"></i> ${location}</p>
        <div class="property-features">
          <span><i class="fas fa-bed"></i> ${beds} Bed${beds !== 1 ? 's' : ''}</span>
          <span><i class="fas fa-bath"></i> ${baths} Bath${baths !== 1 ? 's' : ''}</span>
          <span><i class="fas fa-ruler-combined"></i> ${size} sqft</span>
        </div>
        ${property.savedAt ? `<div class="saved-date" style="font-size: 0.85rem; color: #666; margin: 0.5rem 0;">
          <i class="fas fa-heart" style="color: #e74c3c;"></i> Saved ${formatDate(property.savedAt)}
        </div>` : ''}
        <div class="property-actions" style="display: flex; gap: 0.5rem; margin-top: 1rem;">
          <button class="btn btn-primary" onclick="viewDetails('${property._id}')"
                  style="flex: 1; background: #228B22; color: white; border: none; padding: 0.5rem; border-radius: 5px; cursor: pointer;">
            <i class="fas fa-eye"></i> View Details
          </button>
          <button class="btn btn-secondary" onclick="removeSavedProperty('${property._id}', event)"
                  style="flex: 1; background: #e74c3c; color: white; border: none; padding: 0.5rem; border-radius: 5px; cursor: pointer;">
            <i class="fas fa-heart-broken"></i> Remove
          </button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });

  // Add summary info
  const summaryDiv = document.createElement("div");
  summaryDiv.style.cssText = "grid-column: 1 / -1; text-align: center; padding: 1rem; color: #666; font-size: 0.9rem;";
  summaryDiv.innerHTML = `<i class="fas fa-info-circle"></i> You have ${properties.length} saved propert${properties.length !== 1 ? 'ies' : 'y'}`;
  grid.appendChild(summaryDiv);
}

function formatDate(timestamp) {
  if (!timestamp) return '';

  // Handle Firestore timestamp
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'today';
  } else if (diffDays === 1) {
    return 'yesterday';
  } else if (diffDays <= 7) {
    return `${diffDays} days ago`;
  } else if (diffDays <= 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

// Navigate back to property details (from saved properties page)
function viewDetails(propertyId) {
  if (propertyId) {
    // Redirect to property details page with the property ID
    window.location.href = `property-details.html?id=${propertyId}`;
  } else {
    showNotification('Error', 'Invalid property ID');
  }
}

// Remove property from student's saved list
async function removeSavedProperty(propertyId, event) { // Added event parameter here
  if (!propertyId) {
    showNotification('Error', 'Invalid property ID');
    return;
  }

  // Show confirmation dialog
  if (!confirm('Are you sure you want to remove this property from your saved list?')) {
    return;
  }

  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("Student not authenticated");
    }

    // Find and disable the remove button to show loading state
    const removeBtn = event.target.closest('button');
    const originalText = removeBtn.innerHTML;
    removeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Removing...';
    removeBtn.disabled = true;

    // Remove from student's saved properties subcollection
    await deleteDoc(doc(db, "users", user.uid, "savedProperties", propertyId));

    // Show success message
    showNotification('Success', 'Property removed from your saved list');

    // Refresh the saved properties list to show updated state
    await fetchSavedProperties();

  } catch (error) {
    console.error("Error removing saved property:", error);

    // Restore button state on error
    if (removeBtn) {
      removeBtn.innerHTML = originalText;
      removeBtn.disabled = false;
    }

    // Show error message
    showNotification('Error', 'Failed to remove property. Please try again.');
  }
}

// Utility function for showing notifications to student
function showNotification(type, message) {
  // Create or update global message element
  let messageEl = document.getElementById("globalNotification");
  if (!messageEl) {
    messageEl = document.createElement("div");
    messageEl.id = "globalNotification";
    messageEl.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 8px;
      z-index: 10000;
      font-weight: 500;
      transition: all 0.3s ease;
      max-width: 400px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-family: 'Poppins', Arial, sans-serif;
      display: flex; /* Use flexbox for alignment */
      align-items: center; /* Vertically align items */
      gap: 10px; /* Space between icon/text and close button */
    `;
    document.body.appendChild(messageEl);
  }

  // Determine icon based on type
  const iconHtml = `<i class="fas fa-${type.toLowerCase() === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i>`;

  // Create close button
  const closeButtonHtml = `
    <button class="notification-close-btn" style="
      background: none;
      border: none;
      font-size: 1.2em;
      cursor: pointer;
      color: inherit; /* Inherit color from parent for consistency */
      margin-left: auto; /* Push button to the right */
      padding: 0;
      line-height: 1;
    ">&times;</button>
  `;

  messageEl.innerHTML = `${iconHtml} <span>${message}</span> ${closeButtonHtml}`;


  if (type.toLowerCase() === "success") {
    messageEl.style.backgroundColor = "#d4edda";
    messageEl.style.color = "#155724";
    messageEl.style.border = "1px solid #c3e6cb";
  } else if (type.toLowerCase() === "error") {
    messageEl.style.backgroundColor = "#f8d7da";
    messageEl.style.color = "#721c24";
    messageEl.style.border = "1px solid #f5c6cb";
  }

  messageEl.style.display = "flex"; // Ensure flexbox is applied
  messageEl.style.opacity = "1";

  // Get the newly added close button and attach event listener
  const closeBtn = messageEl.querySelector(".notification-close-btn");
  if (closeBtn) {
    closeBtn.onclick = () => {
      messageEl.style.opacity = "0";
      setTimeout(() => {
        messageEl.style.display = "none";
      }, 300);
    };
  }

  // Clear any existing timeout before setting a new one
  if (messageEl.timeoutId) {
    clearTimeout(messageEl.timeoutId);
  }

  // Set new timeout for auto-dismissal
  messageEl.timeoutId = setTimeout(() => {
    messageEl.style.opacity = "0";
    setTimeout(() => {
      messageEl.style.display = "none";
    }, 300);
  }, 4000); // Show for 4 seconds for better UX
}

/**
 * Handles user logout.
 * Clears authentication session and redirects to the home page.
 */
async function handleLogout() {
  try {
    await signOut(auth);
    showNotification('Success', 'Logged out successfully!');
    window.location.href = "index.html"; // Redirect to your home/login page
  } catch (error) {
    console.error("Error during logout:", error);
    showNotification('Error', 'Failed to log out. Please try again.');
  }
}


// Global function to manually refresh saved properties (can be called from UI)
window.refreshSavedProperties = fetchSavedProperties;

// Make functions globally available for onclick handlers
window.viewDetails = viewDetails;
window.removeSavedProperty = removeSavedProperty;
window.handleLogout = handleLogout;
