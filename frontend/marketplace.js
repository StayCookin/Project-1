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
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// Firebase config
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



let currentUser = null;
let currentUserData = null;
let currentProperties = [];
let filteredProperties = [];

// Real-time listener for property updates
async function setupPropertiesListener(role, user) {
  console.log(`Setting up real-time properties listener for ${role}`);
  
  try {
    const { onSnapshot, orderBy } = await import("https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js");
    const propertiesRef = collection(db, "properties");
    
    // All users see all properties, ordered by creation date
    const propertiesQuery = query(propertiesRef, orderBy("createdAt", "desc"));
    
    // Set up real-time listener
    const unsubscribe = onSnapshot(propertiesQuery, (snapshot) => {
      console.log("Properties updated in real-time");
      currentProperties = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Reapply current filters to updated data
      applyCurrentFilters();
    }, (error) => {
      console.error("Properties listener error:", error);
    });
    
    // Store unsubscribe function for cleanup
    window.propertiesUnsubscribe = unsubscribe;
    
  } catch (error) {
    console.error("Failed to setup properties listener:", error);
    // Fallback to one-time load
    await loadProperties(role, user);
  }
}

// Navigation setup
function setupNavigationButtons(role) {
  console.log(`🧭 Setting up navigation for ${role}`);
  
  // Add Property button (landlords only)
  const addPropertyBtn = document.getElementById('addPropertyBtn');
  if (addPropertyBtn) {
    addPropertyBtn.addEventListener('click', () => {
      window.location.href = 'add-property.html';
    });
  }
  
  // Profile button
  const profileBtn = document.getElementById('profileBtn');
  if (profileBtn) {
    profileBtn.addEventListener('click', () => {
      window.location.href = 'profile.html';
    });
  }
  
  // Settings button
  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      window.location.href = 'settings.html';
    });
  }
  
  // Help/Support button
  const helpBtn = document.getElementById('helpBtn');
  if (helpBtn) {
    helpBtn.addEventListener('click', () => {
      window.location.href = 'help.html';
    });
  }
}
async function deleteProperty(propertyId) {
  console.log("🗑️ Attempting to delete property:", propertyId);
  
  // Find the property to get its details for confirmation
  const property = currentProperties.find(p => p.id === propertyId);
  if (!property) {
    console.error("Property not found:", propertyId);
    alert("Property not found. Please refresh the page and try again.");
    return;
  }
  
  // Verify ownership
  if (property.landlordId !== currentUser?.uid) {
    console.error("❌ User does not own this property");
    alert("You can only delete your own properties.");
    return;
  }
  
  // Confirm deletion
  const confirmed = confirm(
    `Are you sure you want to delete "${property.title}"?\n\n` +
    `Location: ${property.location}\n` +
    `Price: P${property.price || property.rent}/month\n\n` +
    `This action cannot be undone.`
  );
  
  if (!confirmed) {
    console.log("Property deletion cancelled by user");
    return;
  }
  
  try {
    // Show loading state on the delete button
    const deleteBtn = document.querySelector(`[onclick="deleteProperty('${propertyId}')"]`);
    const originalText = deleteBtn?.innerHTML;
    if (deleteBtn) {
      deleteBtn.disabled = true;
      deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
    }
    
    // Import deleteDoc function
    const { deleteDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js");
    
    // Delete from Firebase
    console.log("🔥 Deleting property from Firebase...");
    const propertyRef = doc(db, "properties", propertyId);
    await deleteDoc(propertyRef);
    
    console.log("✅ Property successfully deleted from Firebase");
    
    // Update local arrays immediately for better UX
    currentProperties = currentProperties.filter(p => p.id !== propertyId);
    filteredProperties = filteredProperties.filter(p => p.id !== propertyId);
    
    // Update the display
    displayProperties(filteredProperties);
    updateResultsCount();
    
    // Show success message
    alert(`Property "${property.title}" has been successfully deleted.`);
    
    console.log("✅ Property deletion completed successfully");
    
  } catch (error) {
    console.error("❌ Error deleting property:", error);
    
    // Restore button state
    const deleteBtn = document.querySelector(`[onclick="deleteProperty('${propertyId}')"]`);
    if (deleteBtn && originalText) {
      deleteBtn.disabled = false;
      deleteBtn.innerHTML = originalText;
    }
    
    // Show specific error messages
    let errorMessage = "Failed to delete property. Please try again.";
    
    if (error.code === 'permission-denied') {
      errorMessage = "Permission denied. You may not have the required permissions to delete this property.";
    } else if (error.code === 'not-found') {
      errorMessage = "Property not found. It may have already been deleted.";
    } else if (error.code === 'unavailable') {
      errorMessage = "Database temporarily unavailable. Please try again in a few moments.";
    } else if (error.message?.includes('timeout')) {
      errorMessage = "Connection timed out. Please check your internet connection and try again.";
    }
    
    alert(errorMessage);
  }
}

// Make the function globally available
window.deleteProperty = deleteProperty;

// Logout functionality
function setupLogout() {
  console.log("🚪 Setting up logout functionality");
  
  // Additional logout buttons if any
  const logoutBtns = document.querySelectorAll('[data-action="logout"]');
  logoutBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        // Clean up listeners
        if (window.propertiesUnsubscribe) {
          window.propertiesUnsubscribe();
        }
        
        await signOut(auth);
        window.location.href = "index.html";
      } catch (error) {
        console.error("❌ Logout error:", error);
        alert("Error logging out. Please try again.");
      }
    });
  });
}

// UI adjustments based on role
function adjustUIForRole(role) {
  console.log(`🎨 Adjusting UI elements for ${role}`);
  
  // Role-specific styling
  const body = document.body;
  body.className = body.className.replace(/role-\w+/g, '');
  body.classList.add(`role-${role.toLowerCase()}`);
  
  // Adjust search placeholder text
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.placeholder = role === 'STUDENT' 
      ? "Search properties, locations, amenities..." 
      : "Search your properties...";
  }
  
  // Show/hide filters based on role
  const studentFilters = document.querySelectorAll('.filter-student-only');
  const landlordFilters = document.querySelectorAll('.filter-landlord-only');
  
  studentFilters.forEach(filter => {
    filter.style.display = role === 'STUDENT' ? 'block' : 'none';
  });
  
  landlordFilters.forEach(filter => {
    filter.style.display = role === 'LANDLORD' ? 'block' : 'none';
  });
  
  // Update page header with user info
  const userInfo = document.getElementById('userInfo');
  if (userInfo && currentUserData) {
    userInfo.innerHTML = `
      <span class="user-email">${currentUserData.email}</span>
      <span class="user-role">${role === 'STUDENT' ? 'Student' : 'Landlord'}</span>
    `;
  }
}

// DOM element references
const dashboard = document.getElementById("dashboardBtn");
const messages = document.getElementById("messagesBtnHeader");
const logOut = document.getElementById("logoutBtn");

// Logout function
if (logOut) {
  logOut.addEventListener("click", async () => {
    try {
      console.log("🚪 Logging out user...");
      await signOut(auth);
      console.log("✅ Logout successful, redirecting to login");
      window.location.href = "index.html";
    } catch (error) {
      console.error("❌ Logout error:", error);
      alert("Error logging out. Please try again.");
    }
  });
}

// Redirect to messages page
if (messages) {
  messages.addEventListener("click", () => {
    console.log("📨 Redirecting to messages page");
    window.location.href = "messages.html";
  });
}

// Dashboard redirect based on role from Firebase
if (dashboard) {
  dashboard.addEventListener("click", () => {
    console.log("currentUser data at click", currentUserData);
    if (!currentUserData || !currentUserData.role) {
      console.log("❌ No user data available, requesting login");
      alert("Please login to access your dashboard.");
      signOut(auth).then(() => {
        window.location.href = "index.html";
      });
      return;
    }
    
    const role = currentUserData.role;
    console.log("🏠 Dashboard clicked. Current role:", role);
    
    if (role === "LANDLORD") {
      console.log("🏠 Redirecting to landlord dashboard");
      window.location.href = "landlord-dashboard.html";
    } else if (role === "STUDENT") {
      console.log("🎓 Redirecting to student dashboard");
      window.location.href = "student-dashboard.html";
    } else {
      console.log("❌ Invalid role found:", role);
      alert("Invalid user role. Please contact support.");
      signOut(auth).then(() => {
        window.location.href = "index.html";
      });
    }
  });
}

// Search and Filter Functionality
function setupSearchAndFilters(role) {
  console.log(`🔍 Setting up search and filters for ${role}`);
  
  // Search functionality
  const searchInput = document.getElementById("searchInput");
  const searchBtn = document.getElementById("searchBtn");
  const sortBy = document.getElementById("sortBy");
  
  if (searchBtn) {
    searchBtn.addEventListener("click", () => {
      performAdvancedSearch();
    });
  }
  
  if (searchInput) {
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        performAdvancedSearch();
      }
    });
    
    // Real-time search as user types (with debouncing)
    searchInput.addEventListener("input", () => {
      clearTimeout(searchInput.searchTimeout);
      searchInput.searchTimeout = setTimeout(performAdvancedSearch, 300);
    });
  }
  
  // Sort functionality
  if (sortBy) {
    sortBy.addEventListener("change", () => {
      performAdvancedSearch();
    });
  }
  
  // Filter functionality
  const filterBtn = document.getElementById("filterBtn");
  const applyFiltersBtn = document.getElementById("applyFiltersBtn");
  const clearFiltersBtn = document.getElementById("clearFiltersBtn");
  
  if (filterBtn) {
    filterBtn.addEventListener("click", () => {
      toggleFilterPanel();
    });
  }
  
  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener("click", () => {
      applyCurrentFilters();
    });
  }
  
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener("click", () => {
      clearAllFilters();
    });
  }
  
  // Price range filters with validation
  const minPriceInput = document.getElementById("minPrice");
  const maxPriceInput = document.getElementById("maxPrice");
  
  if (minPriceInput) {
    minPriceInput.addEventListener("change", () => {
      validatePriceRange();
      applyCurrentFilters();
    });
  }
  
  if (maxPriceInput) {
    maxPriceInput.addEventListener("change", () => {
      validatePriceRange();
      applyCurrentFilters();
    });
  }
  
  // Location filter
  const locationSelect = document.getElementById("locationFilter");
  if (locationSelect) {
    locationSelect.addEventListener("change", applyCurrentFilters);
  }
  
  // Property type filter
  const propertyTypeSelect = document.getElementById("propertyTypeFilter");
  if (propertyTypeSelect) {
    propertyTypeSelect.addEventListener("change", applyCurrentFilters);
  }
  
  // Availability filter (for landlords)
  const availabilityFilter = document.getElementById("availabilityFilter");
  if (availabilityFilter && role === "LANDLORD") {
    availabilityFilter.addEventListener("change", applyCurrentFilters);
  }
  
  // Setup quick filters
  setupQuickFilters();
}

/**
 * Validates price range inputs
 */
function validatePriceRange() {
  const minPrice = document.getElementById("minPrice");
  const maxPrice = document.getElementById("maxPrice");
  
  if (minPrice && maxPrice) {
    const min = parseFloat(minPrice.value) || 0;
    const max = parseFloat(maxPrice.value) || Infinity;
    
    if (min > max && max !== Infinity) {
      maxPrice.setCustomValidity("Maximum price must be greater than minimum price");
      maxPrice.reportValidity();
    } else {
      maxPrice.setCustomValidity("");
    }
  }
}

/**
 * Performs search with current sort order (replaces simple performSearch)
 */
function performSearch() {
  performAdvancedSearch();
}

/**
 * Advanced search with sorting options
 */
function performAdvancedSearch() {
  const searchInput = document.getElementById("searchInput");
  const sortBy = document.getElementById("sortBy")?.value || "newest";
  const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : "";
  
  console.log("🔍 Performing advanced search:", { searchTerm, sortBy });
  
  let filtered = [...currentProperties];
  
  // Apply search filter
  if (searchTerm) {
    filtered = filtered.filter(property => {
      const searchableFields = [
        property.title,
        property.description,
        property.location,
        property.address,
        property.neighborhood,
        property.propertyType,
        property.landlordName
      ].filter(Boolean).map(field => field.toLowerCase());
      
      const amenitiesText = (property.amenities || []).join(' ').toLowerCase();
      searchableFields.push(amenitiesText);
      
      return searchableFields.some(field => field.includes(searchTerm));
    });
  }
  
  // Apply sorting
  filtered.sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return (parseFloat(a.rent) || 0) - (parseFloat(b.rent) || 0);
      case 'price-high':
        return (parseFloat(b.rent) || 0) - (parseFloat(a.rent) || 0);
      case 'location':
        return (a.location || '').localeCompare(b.location || '');
      case 'newest':
      default:
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
    }
  });
  
  filteredProperties = filtered;
  displayProperties(filteredProperties);
  updateResultsCount();
}

/**
 * Quick filters for common searches
 */
function applyQuickFilter(filterType) {
  console.log("⚡ Applying quick filter:", filterType);
  
  let filtered = [...currentProperties];
  
  switch (filterType) {
    case 'under-500':
      filtered = filtered.filter(p => parseFloat(p.rent) <= 500);
      break;
    case 'under-1000':
      filtered = filtered.filter(p => parseFloat(p.rent) <= 1000);
      break;
    case 'furnished':
      filtered = filtered.filter(p => 
        p.amenities?.some(amenity => 
          amenity.toLowerCase().includes('furnished')
        )
      );
      break;
    case 'pet-friendly':
      filtered = filtered.filter(p => 
        p.amenities?.some(amenity => 
          amenity.toLowerCase().includes('pet') || 
          amenity.toLowerCase().includes('animal')
        )
      );
      break;
    case 'wifi':
      filtered = filtered.filter(p => 
        p.amenities?.some(amenity => 
          amenity.toLowerCase().includes('wifi') || 
          amenity.toLowerCase().includes('internet')
        )
      );
      break;
    case 'parking':
      filtered = filtered.filter(p => 
        p.amenities?.some(amenity => 
          amenity.toLowerCase().includes('parking') || 
          amenity.toLowerCase().includes('garage')
        )
      );
      break;
    default:
      console.warn("Unknown quick filter:", filterType);
      return;
  }
  
  filteredProperties = filtered;
  displayProperties(filteredProperties);
  updateResultsCount();
  
  // Update UI to show active filter
  document.querySelectorAll('.quick-filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-filter="${filterType}"]`)?.classList.add('active');
}

/**
 * Setup quick filter buttons
 */
function setupQuickFilters() {
  const quickFilterBtns = document.querySelectorAll('.quick-filter-btn');
  quickFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filterType = btn.dataset.filter;
      if (filterType) {
        applyQuickFilter(filterType);
      }
    });
  });
  
  // Clear quick filters button
  const clearQuickFiltersBtn = document.getElementById('clearQuickFilters');
  if (clearQuickFiltersBtn) {
    clearQuickFiltersBtn.addEventListener('click', () => {
      document.querySelectorAll('.quick-filter-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      filteredProperties = [...currentProperties];
      displayProperties(filteredProperties);
      updateResultsCount();
    });
  }
}

/**
 * Toggles filter panel visibility
 */
function toggleFilterPanel() {
  const filterPanel = document.getElementById("filterPanel");
  const filterBtn = document.getElementById("filterBtn");
  
  if (filterPanel) {
    const isVisible = filterPanel.classList.toggle("show");
    console.log("🎛️ Filter panel toggled:", isVisible ? "visible" : "hidden");
    
    if (filterBtn) {
      filterBtn.textContent = isVisible ? "Hide Filters" : "Show Filters";
    }
  }
}

/**
 * Applies current filters to properties
 */
function applyCurrentFilters() {
  console.log("🎛️ Applying current filters...");
  
  let filtered = [...currentProperties];
  
  // Apply search term first
  const searchInput = document.getElementById("searchInput");
  const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : "";
  
  if (searchTerm) {
    filtered = filtered.filter(property => {
      const searchableFields = [
        property.title,
        property.description,
        property.location,
        property.address,
        property.neighborhood,
        property.propertyType
      ].filter(Boolean).map(field => field.toLowerCase());
      
      const amenitiesText = (property.amenities || []).join(' ').toLowerCase();
      searchableFields.push(amenitiesText);
      
      return searchableFields.some(field => field.includes(searchTerm));
    });
  }
  
  // Price range filter
  const minPrice = parseFloat(document.getElementById("minPrice")?.value) || 0;
  const maxPrice = parseFloat(document.getElementById("maxPrice")?.value) || Infinity;
  
  if (minPrice > 0 || maxPrice < Infinity) {
    filtered = filtered.filter(property => {
      const price = parseFloat(property.rent) || 0;
      return price >= minPrice && price <= maxPrice;
    });
  }
  
  // Location filter
  const locationFilter = document.getElementById("locationFilter")?.value;
  if (locationFilter && locationFilter !== "all") {
    filtered = filtered.filter(property => 
      property.location?.toLowerCase().includes(locationFilter.toLowerCase()) ||
      property.neighborhood?.toLowerCase().includes(locationFilter.toLowerCase())
    );
  }
  
  // Property type filter
  const propertyTypeFilter = document.getElementById("propertyTypeFilter")?.value;
  if (propertyTypeFilter && propertyTypeFilter !== "all") {
    filtered = filtered.filter(property => 
      property.propertyType?.toLowerCase() === propertyTypeFilter.toLowerCase()
    );
  }
  
  // Availability filter (mainly for landlords)
  const availabilityFilter = document.getElementById("availabilityFilter")?.value;
  if (availabilityFilter && availabilityFilter !== "all") {
    filtered = filtered.filter(property => 
      property.status?.toLowerCase() === availabilityFilter.toLowerCase()
    );
  }
  
  // Amenities filter
  const selectedAmenities = Array.from(
    document.querySelectorAll('#amenitiesList input[type="checkbox"]:checked')
  ).map(checkbox => checkbox.value);
  
  if (selectedAmenities.length > 0) {
    filtered = filtered.filter(property => {
      const propertyAmenities = (property.amenities || []).map(a => a.toLowerCase());
      return selectedAmenities.every(amenity => 
        propertyAmenities.some(propAmenity => 
          propAmenity.includes(amenity.toLowerCase())
        )
      );
    });
  }
  
  filteredProperties = filtered;
  console.log(`🎛️ Filters applied: ${filteredProperties.length} properties match criteria`);
  displayProperties(filteredProperties);
  updateResultsCount();
}

/**
 * Clears all filters and search
 */
function clearAllFilters() {
  console.log("🧹 Clearing all filters");
  
  // Clear search input
  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.value = "";
  
  // Clear price filters
  const minPrice = document.getElementById("minPrice");
  const maxPrice = document.getElementById("maxPrice");
  if (minPrice) minPrice.value = "";
  if (maxPrice) maxPrice.value = "";
  
  // Reset select filters
  const locationFilter = document.getElementById("locationFilter");
  const propertyTypeFilter = document.getElementById("propertyTypeFilter");
  const availabilityFilter = document.getElementById("availabilityFilter");
  
  if (locationFilter) locationFilter.value = "all";
  if (propertyTypeFilter) propertyTypeFilter.value = "all";
  if (availabilityFilter) availabilityFilter.value = "all";
  
  // Clear amenities checkboxes
  const amenityCheckboxes = document.querySelectorAll('#amenitiesList input[type="checkbox"]');
  amenityCheckboxes.forEach(checkbox => checkbox.checked = false);
  updateAmenitiesCount();
  
  // Show all properties
  filteredProperties = [...currentProperties];
  displayProperties(filteredProperties);
  updateResultsCount();
}

/**
 * Updates results count display
 */
function updateResultsCount() {
  const resultsCount = document.getElementById("resultsCount");
  if (resultsCount) {
    resultsCount.textContent = `${filteredProperties.length} properties found`;
  }
}

/**
 * Load properties based on user role from Firebase (initial load)
 */
async function loadProperties(role, user) {
  try {
    console.log(`Loading all properties for ${role}`);
    const propertiesRef = collection(db, "properties");
    
    // All users see all properties
    const propertiesQuery = query(propertiesRef, orderBy("createdAt", "desc"));
    
    const snapshot = await getDocs(propertiesQuery);
    currentProperties = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    filteredProperties = [...currentProperties];
    console.log(`Loaded ${currentProperties.length} properties`);
    
    displayProperties(filteredProperties);
    updateResultsCount();
    populateFilterOptions();
    
  } catch (error) {
    console.error("Error loading properties:", error);
    showErrorState(error);
  }
}

/**
 * Populates filter dropdown options based on available properties
 */
function populateFilterOptions() {
  try {
    // Populate location filter
    const locationFilter = document.getElementById("locationFilter");
    if (locationFilter && currentProperties.length > 0) {
      const locations = [...new Set(currentProperties
        .map(p => p.location)
        .filter(Boolean)
      )].sort();
      
      // Keep existing options and add new ones
      const existingOptions = Array.from(locationFilter.options).map(opt => opt.value);
      locations.forEach(location => {
        if (!existingOptions.includes(location)) {
          const option = document.createElement('option');
          option.value = location;
          option.textContent = location;
          locationFilter.appendChild(option);
        }
      });
    }
    
    // Populate property type filter
    const propertyTypeFilter = document.getElementById("propertyTypeFilter");
    if (propertyTypeFilter && currentProperties.length > 0) {
      const propertyTypes = [...new Set(currentProperties
        .map(p => p.propertyType)
        .filter(Boolean)
      )].sort();
      
      const existingOptions = Array.from(propertyTypeFilter.options).map(opt => opt.value);
      propertyTypes.forEach(type => {
        if (!existingOptions.includes(type)) {
          const option = document.createElement('option');
          option.value = type;
          option.textContent = type;
          propertyTypeFilter.appendChild(option);
        }
      });
    }
    
    console.log("✅ Filter options populated");
  } catch (error) {
    console.error("❌ Error populating filter options:", error);
  }
}

/**
 * Shows error state in property list
 */
function showErrorState(error) {
  const propertyList = document.getElementById("propertyList");
  if (propertyList) {
    let errorMessage = "Unable to load properties. Please try again.";
    
    if (error.code === 'permission-denied') {
      errorMessage = "Permission denied. Please check your account permissions.";
    } else if (error.code === 'unavailable') {
      errorMessage = "Database temporarily unavailable. Please try again in a few moments.";
    } else if (error.message?.includes('timeout')) {
      errorMessage = "Connection timed out. Please check your internet connection.";
    }
    
    propertyList.innerHTML = `
      <div class="error-state" style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #d32f2f;">
        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
        <h3>Error Loading Properties</h3>
        <p>${errorMessage}</p>
        <div style="margin-top: 1rem;">
          <button onclick="location.reload()" style="margin-right: 0.5rem; padding: 0.5rem 1rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Retry
          </button>
          <button onclick="signOut(auth).then(() => window.location.href='index.html')" style="padding: 0.5rem 1rem; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Logout
          </button>
        </div>
      </div>`;
  }
}

/**
 * Displays properties in the UI
 */
function displayProperties(properties) {
  const propertyList = document.getElementById("propertyList");
  if (!propertyList) {
    console.warn("Property list container not found");
    return;
  }
  
  if (properties.length === 0) {
    propertyList.innerHTML = `
      <div class="no-results" style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
        <i class="fas fa-search" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
        <h3>No properties found</h3>
        <p>Try adjusting your search criteria or filters.</p>
        <button onclick="clearAllFilters()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Clear Filters
        </button>
      </div>`;
    return;
  }
  
  propertyList.innerHTML = properties.map(property => {
    // Check if current user owns this property
    const isOwner = currentUserData?.role === 'LANDLORD' && property.landlordId === currentUser?.uid;
    
    return `
      <div class="property-card" data-property-id="${property.id}">
        <div class="property-image">
          <img src="${property.imageUrl || property.images?.[0] || '/placeholder-property.jpg'}" 
               alt="${property.title}" 
               onerror="this.src='/placeholder-property.jpg'">
          ${property.status === 'rented' ? '<div class="status-badge rented">Rented</div>' : ''}
          ${property.featured ? '<div class="status-badge featured">Featured</div>' : ''}
          ${isOwner ? '<div class="status-badge owner">Your Property</div>' : ''}
        </div>
        <div class="property-details">
          <h3>${property.title}</h3>
          <p class="location">📍 ${property.location}${property.neighborhood ? `, ${property.neighborhood}` : ''}</p>
          <p class="price">💰 P${property.price || property.rent}/month</p>
          ${property.propertyType ? `<p class="property-type">🏠 ${property.propertyType}</p>` : ''}
          
          <div class="property-actions">
            ${getActionButtonsForProperty(property, isOwner)}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Update getActionButtonsForProperty to style the View Details button and add Schedule Viewing button
function getActionButtonsForProperty(property, isOwner) {
  const userRole = currentUserData?.role;
  let buttons = [];

  // View Details button with border radius and border
  buttons.push(`<button 
    class="view-details-btn btn-primary" 
    onclick="viewPropertyDetails('${property.id}')"
    style="border-radius:6px;border:1px solid #228B22; "
  >
    <i class="fas fa-eye"></i> View Details
  </button>`);

  // Schedule Viewing button for students and available properties
  if (userRole === 'STUDENT' && property.status === 'available') {
    buttons.push(`<button 
      class="schedule-viewing-btn btn-secondary" 
      onclick="scheduleViewing('${property.id}')"
      style="border-radius:6px;border:1px solid #228B22;"
    >
      <i class="fas fa-calendar"></i> Schedule Viewing
    </button>`);
  }

  if (userRole === 'LANDLORD' && isOwner) {
    buttons.push(`<button class="edit-property-btn btn-warning" onclick="editProperty('${property.id}')">
      <i class="fas fa-edit"></i> Edit
    </button>`);
    buttons.push(`<button class="delete-property-btn btn-danger" onclick="deleteProperty('${property.id}')">
      <i class="fas fa-trash"></i> Delete
    </button>`);
  } else if (userRole === 'STUDENT' && property.status === 'available') {
    buttons.push(`<button class="contact-landlord-btn btn-secondary" onclick="contactLandlord('${property.id}')">
      <i class="fas fa-envelope"></i> Contact
    </button>`);
  } else if (userRole === 'LANDLORD' && !isOwner) {
    buttons.push(`<button class="contact-landlord-btn btn-secondary" onclick="contactLandlord('${property.id}')">
      <i class="fas fa-envelope"></i> Contact
    </button>`);
  }

  return buttons.join('');
}

// Add global function for schedule viewing
function scheduleViewing(propertyId) {
  window.location.href = `schedule-viewing.html?property=${propertyId}`;
}
window.scheduleViewing = scheduleViewing;

/**
 * View property details
 */
function viewPropertyDetails(propertyId) {
  console.log("👁️ Viewing details for property:", propertyId);
  window.location.href = `property-details.html?id=${propertyId}`;
}

/**
 * Edit property (for landlords)
 */
function editProperty(propertyId) {
  console.log("✏️ Editing property:", propertyId);
  window.location.href = `edit-property.html?id=${propertyId}`;
}

/**
 * Contact landlord (for students)
 */
function contactLandlord(propertyId) {
  console.log("📞 Contacting landlord for property:", propertyId);
  window.location.href = `messages.html?property=${propertyId}`;
}

// Main authentication and initialization
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 DOM loaded, initializing marketplace...");
  showLoadingState();

  onAuthStateChanged(auth, async (user) => {
    console.log("🔍 Auth state changed. User:", user);
    
    if (!user) {
      console.log("❌ No authenticated user found, redirecting to login");
      window.location.href = "index.html";
      return;
    }

    currentUser = user;
    console.log("✅ User authenticated:");
    console.log("  - UID:", user.uid);
    console.log("  - Email:", user.email);
    console.log("  - Email Verified:", user.emailVerified);

    // Check email verification
    if (!user.emailVerified) {
      console.log("❌ User email not verified");
      alert("Please verify your email address before accessing the marketplace. Check your email for a verification link.");
      await signOut(auth);
      window.location.href = "signup.html";
      return;
    }

    try {
      // Get user data from Firestore
      console.log(`🔍 Fetching user data from Firestore for UID: ${user.uid}`);
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        console.error("❌ User document not found in Firestore!");
        alert("Your user profile was not found. Please sign up again or contact support.");
        await signOut(auth);
        window.location.href = "signup.html";
        return;
      }

      const userData = userDoc.data();
      console.log("✅ User data retrieved from Firestore:", userData);
      
      // Validate required fields
      const requiredFields = ['email', 'role'];
      const missingFields = requiredFields.filter(field => !userData.hasOwnProperty(field));
      
      if (missingFields.length > 0) {
        console.error("❌ Missing required fields:", missingFields);
        alert(`Your profile is incomplete. Missing: ${missingFields.join(', ')}. Please contact support.`);
        return;
      }

      // Validate role
      const role = userData.role?.toString().trim();
      const validRoles = ['STUDENT', 'LANDLORD'];
      
      if (!validRoles.includes(role)) {
        console.error(`❌ Invalid role: '${role}'`);
        alert(`Invalid user role: '${role}'. Please contact support.`);
        await signOut(auth);
        window.location.href = "signup.html";
        return;
      }

      // Store user data globally (from Firebase, not localStorage)
      currentUserData = userData;
      
      console.log(`✅ User authenticated successfully. Role: ${role}`);
      
      hideLoadingState();
      updateUIForRole(role, user);
      setupEventListeners(role, user);
      
      // Load properties based on role
      await loadProperties(role, user);

    } catch (error) {
      console.error("💥 Error in authentication flow:", error);
      
      // Specific error handling
      if (error.code === 'permission-denied') {
        alert("Permission denied. Your account may not have the required permissions. Please contact support.");
      } else if (error.code === 'unavailable') {
        alert("Database temporarily unavailable. Please try again in a few moments.");
      } else if (error.message?.includes('timeout')) {
        alert("Database connection timed out. Please check your internet connection and try again.");
      } else {
        alert(`Error loading profile: ${error.message}. Please try refreshing the page.`);
      }
      
      hideLoadingState();
      await signOut(auth);
      window.location.href = "index.html";
    }
  });
});

/**
 * Updates UI elements based on user role
 */
function updateUIForRole(role, user) {
  console.log(`🎨 Updating UI for role: ${role}`);
  
  const welcomeMessage = document.getElementById('welcomeMessage');
  if (welcomeMessage) {
    welcomeMessage.textContent = role === 'STUDENT'
      ? 'Find Your Perfect Student Accommodation'
      : role === 'LANDLORD'
      ? 'Manage Your Properties'
      : 'Dashboard';
  }

  const pageTitle = document.querySelector('h1');
  if (pageTitle) {
    pageTitle.textContent = role === 'STUDENT'
      ? 'Browse Properties'
      : role === 'LANDLORD'
      ? 'Property Management'
      : 'Dashboard';
  }

  const headerRole = document.getElementById('userRoleIndicator');
  if (headerRole) {
    const displayRole = role === 'STUDENT' ? 'Student' : role === 'LANDLORD' ? 'Landlord' : role;
    headerRole.textContent = `${displayRole} Dashboard`;
  }

  // Show/hide role-specific elements
  const addPropertyBtn = document.getElementById('addPropertyBtn');
  if (addPropertyBtn) {
    addPropertyBtn.style.display = role === 'LANDLORD' ? 'inline-block' : 'none';
  }
  
  const studentOnlyElements = document.querySelectorAll('.student-only');
  const landlordOnlyElements = document.querySelectorAll('.landlord-only');
  
  studentOnlyElements.forEach(el => {
    el.style.display = role === 'STUDENT' ? 'block' : 'none';
  });
  
  landlordOnlyElements.forEach(el => {
    el.style.display = role === 'LANDLORD' ? 'block' : 'none';
  });

  adjustUIForRole(role);
}

/**
 * Sets up event listeners after successful authentication
 */
function setupEventListeners(role, user) {
  console.log(`⚙️ Setting up event listeners for ${role}`);
  
  setupAmenitiesDropdown();
  setupNavigationButtons(role);
  setupLogout();
  setupPropertiesListener(role, user);
  setupSearchAndFilters(role);
}

/**
 * Amenities dropdown functionality
 */
function setupAmenitiesDropdown() {
  const dropdownBtn = document.getElementById('amenitiesDropdownBtn');
  const dropdownList = document.getElementById('amenitiesList');

  if (!dropdownBtn || !dropdownList) {
    console.warn("⚠️ Amenities dropdown elements not found");
    return;
  }
  
  if (dropdownBtn.dataset.initialized) return;
  dropdownBtn.dataset.initialized = 'true';

  dropdownBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isExpanded = dropdownList.classList.toggle('show');
    dropdownBtn.setAttribute('aria-expanded', isExpanded);
  });

  document.addEventListener('click', (e) => {
    if (!dropdownBtn.contains(e.target) && !dropdownList.contains(e.target)) {
      if (dropdownList.classList.contains('show')) {
        dropdownList.classList.remove('show');
        dropdownBtn.setAttribute('aria-expanded', 'false');
      }
    }
  });

  dropdownList.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  const checkboxes = dropdownList.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      updateAmenitiesCount();
      setTimeout(applyCurrentFilters, 100);
    });
  });
}

/**
 * Updates amenities counter
 */
function updateAmenitiesCount() {
  const checkboxes = document.querySelectorAll('#amenitiesList input[type="checkbox"]:checked');
  const countSpan = document.getElementById('amenitiesSelectedCount');
  if (countSpan) {
    countSpan.textContent = checkboxes.length > 0 ? `(${checkboxes.length})` : '';
  }
}

/**
 * Shows loading state
 */
function showLoadingState() {
  const propertyList = document.getElementById("propertyList");
  if (propertyList) {
    propertyList.innerHTML = `
      <div class="loading-state" style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
        <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--forest-green);"></i>
        <p>Loading marketplace...</p>
      </div>`;
  }
}

/**
 * Hides loading state
 */
function hideLoadingState() {
  const propertyList = document.getElementById("propertyList");
  if (propertyList) {
    const loadingState = propertyList.querySelector('.loading-state');
    if (loadingState) {
      loadingState.remove();
    }
  }
}

// Make functions globally available for HTML onclick handlers
window.viewPropertyDetails = viewPropertyDetails;
window.editProperty = editProperty;
window.contactLandlord = contactLandlord;
window.applyCurrentFilters = applyCurrentFilters;
window.clearAllFilters = clearAllFilters;
window.performSearch = performSearch;
window.performAdvancedSearch = performAdvancedSearch;
window.applyQuickFilter = applyQuickFilter;
window.signOut = signOut;
window.auth = auth;

// Cleanup function for page unload
window.addEventListener('beforeunload', () => {
  if (window.propertiesUnsubscribe) {
    window.propertiesUnsubscribe();
  }
});

// Export key functions for other modules if needed
export {
  auth,
  db,
  currentUser,
  currentUserData,
  currentProperties,
  filteredProperties,
  loadProperties,
  applyCurrentFilters,
  performAdvancedSearch
};