// Enhanced property details logic to ensure it shows specific property information
document.addEventListener("DOMContentLoaded", function () {
  let currentUser = null;
  let currentProperty = null;

  // Check authentication state
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (!user) {
      showError("You must be logged in to view property details.");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 2000);
      return;
    }

    try {
      // Verify user role
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        throw new Error("User profile not found");
      }
      
      const userData = userDoc.data();
      if (!userData || userData.role !== "student") {
        showError("Only students can view property details");
        setTimeout(() => {
          window.location.href = "index.html";
        }, 2000);
        return;
      }

      currentUser = user;
      
      // Fetch and render the SPECIFIC property details
      await fetchSpecificPropertyDetails();
      
    } catch (error) {
      console.error("Error checking user authentication:", error);
      showError("Failed to verify user permissions. Please try logging in again.");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 2000);
    }
  });

  async function fetchSpecificPropertyDetails() {
    // Get the specific property ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const propertyId = urlParams.get("id");
    
    console.log("Property ID from URL:", propertyId); // Debug log
    
    if (!propertyId) {
      showError("Property ID not found in URL");
      document.getElementById("propertyTitle").textContent = "Property not found.";
      return;
    }

    try {
      showLoading("Loading property details...");
      
      // Fetch the SPECIFIC property from Firestore using the ID
      const propertyDocRef = doc(db, "properties", propertyId);
      const propertyDoc = await getDoc(propertyDocRef);
      
      if (!propertyDoc.exists()) {
        throw new Error("Property not found");
      }
      
      // Get the property data with its ID
      const property = {
        id: propertyDoc.id,
        ...propertyDoc.data()
      };
      
      console.log("Fetched property data:", property); // Debug log
      
      currentProperty = property;
      
      // Render THIS SPECIFIC property's details
      renderSpecificProperty(property);
      
      // Fetch similar properties (excluding this one)
      await fetchSimilarProperties(property);
      
      // Check if this specific property is saved by current user
      await checkIfPropertySaved(propertyId);
      
      hideLoading();
      
    } catch (error) {
      console.error("Error fetching specific property details:", error);
      hideLoading();
      showError(`Failed to load property: ${error.message}`);
      document.getElementById("propertyTitle").textContent = "Failed to load property.";
    }
  }

  function renderSpecificProperty(property) {
    // Update page title with THIS property's name
    document.title = `${property.title || property.name} - Property Details`;
    
    // Render basic information for THIS SPECIFIC property
    const titleElement = document.getElementById("propertyTitle");
    const locationElement = document.getElementById("propertyLocation");
    const priceElement = document.getElementById("propertyPrice");
    
    if (titleElement) {
      titleElement.textContent = property.title || property.name || "Untitled Property";
    }
    
    if (locationElement) {
      locationElement.innerHTML = 
        `<i class='fas fa-map-marker-alt'></i> ${property.location || property.address || 'Location not specified'}`;
    }
    
    if (priceElement) {
      priceElement.textContent = `P${formatPrice(property.rent || property.price)}/month`;
    }

    // Render gallery with THIS property's images
    renderPropertyGallery(property);
    
    // Render ALL available details for THIS property
    renderAllPropertyDetails(property);
    
    // Setup contact forms for THIS property
    setupContactForms(property);
  }

  function renderPropertyGallery(property) {
    const gallery = document.getElementById("propertyGallery");
    if (!gallery) return;
    
    // Handle multiple image formats that landlords might use
    const images = [];
    
    // Check various image field names
    if (property.images && Array.isArray(property.images)) {
      images.push(...property.images);
    }
    if (property.imageUrl) {
      images.push(property.imageUrl);
    }
    if (property.image) {
      images.push(property.image);
    }
    if (property.photos && Array.isArray(property.photos)) {
      images.push(...property.photos);
    }
    
    // Remove duplicates and empty values
    const uniqueImages = [...new Set(images.filter(img => img && img.trim()))];
    
    if (uniqueImages.length === 0) {
      // No images available
      gallery.innerHTML = `
        <div class="no-image-placeholder" style="
          width: 100%; 
          height: 400px; 
          background: #f8f9fa; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          color: #666;
          font-size: 18px;
          border: 2px dashed #dee2e6;
          border-radius: 8px;
        ">
          <i class="fas fa-image" style="margin-right: 10px;"></i>
          No images available for this property
        </div>
      `;
      return;
    }
    
    // Display main image
    const mainImage = uniqueImages[0];
    gallery.innerHTML = `
      <div class="main-image-container" style="position: relative; margin-bottom: 1rem;">
        <img src="${mainImage}" 
             alt="${property.title || property.name}" 
             class="main-image" 
             style="width: 100%; height: 400px; object-fit: cover; border-radius: 8px;" 
             onerror="this.src='/img/default-property.jpg'" />
        ${uniqueImages.length > 1 ? `
          <div class="image-counter" style="
            position: absolute; 
            top: 15px; 
            right: 15px; 
            background: rgba(0,0,0,0.7); 
            color: white; 
            padding: 5px 10px; 
            border-radius: 20px; 
            font-size: 14px;
          ">
            1 / ${uniqueImages.length}
          </div>
        ` : ''}
      </div>
    `;
    
    // Add thumbnails if there are multiple images
    if (uniqueImages.length > 1) {
      const thumbnailGrid = document.createElement('div');
      thumbnailGrid.className = 'thumbnail-grid';
      thumbnailGrid.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
        gap: 10px;
        margin-top: 15px;
      `;
      
      uniqueImages.forEach((img, index) => {
        const thumbnail = document.createElement('img');
        thumbnail.src = img;
        thumbnail.className = 'thumbnail';
        thumbnail.alt = `${property.title || property.name} - Image ${index + 1}`;
        thumbnail.style.cssText = `
          width: 100%;
          height: 80px;
          object-fit: cover;
          border-radius: 6px;
          cursor: pointer;
          border: 2px solid ${index === 0 ? '#007bff' : 'transparent'};
          transition: border-color 0.3s ease;
        `;
        thumbnail.onerror = () => thumbnail.style.display = 'none';
        
        thumbnail.addEventListener('click', () => {
          const mainImg = gallery.querySelector('.main-image');
          const counter = gallery.querySelector('.image-counter');
          
          if (mainImg) {
            mainImg.src = img;
          }
          
          if (counter) {
            counter.textContent = `${index + 1} / ${uniqueImages.length}`;
          }
          
          // Update thumbnail borders
          thumbnailGrid.querySelectorAll('.thumbnail').forEach((thumb, i) => {
            thumb.style.borderColor = i === index ? '#007bff' : 'transparent';
          });
        });
        
        thumbnailGrid.appendChild(thumbnail);
      });
      
      gallery.appendChild(thumbnailGrid);
    }
  }

  function renderAllPropertyDetails(property) {
    const details = document.getElementById("propertyDetails");
    if (!details) return;
    
    // Display ALL available information from the landlord
    const amenities = formatAmenities(property.amenities || property.features || []);
    
    details.innerHTML = `
      <div class='property-overview' style='margin-bottom: 2rem;'>
        <div class='features-grid' style='display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;'>
          <div class='feature-item' style='display: flex; align-items: center; padding: 1rem; background: #f8f9fa; border-radius: 8px;'>
            <i class='fas fa-bed feature-icon' style='font-size: 24px; color: #007bff; margin-right: 12px;'></i>
            <div>
              <h3 style='margin: 0; font-size: 18px;'>${property.bedrooms || property.beds || property.rooms || 1}</h3>
              <p style='margin: 0; color: #666; font-size: 14px;'>Bedroom${(property.bedrooms || property.beds || property.rooms || 1) > 1 ? 's' : ''}</p>
            </div>
          </div>
          <div class='feature-item' style='display: flex; align-items: center; padding: 1rem; background: #f8f9fa; border-radius: 8px;'>
            <i class='fas fa-bath feature-icon' style='font-size: 24px; color: #007bff; margin-right: 12px;'></i>
            <div>
              <h3 style='margin: 0; font-size: 18px;'>${property.bathrooms || property.baths || property.bathroom || 1}</h3>
              <p style='margin: 0; color: #666; font-size: 14px;'>Bathroom${(property.bathrooms || property.baths || property.bathroom || 1) > 1 ? 's' : ''}</p>
            </div>
          </div>
          <div class='feature-item' style='display: flex; align-items: center; padding: 1rem; background: #f8f9fa; border-radius: 8px;'>
            <i class='fas fa-ruler-combined feature-icon' style='font-size: 24px; color: #007bff; margin-right: 12px;'></i>
            <div>
              <h3 style='margin: 0; font-size: 18px;'>${property.size || property.area || 'N/A'}</h3>
              <p style='margin: 0; color: #666; font-size: 14px;'>Square Feet</p>
            </div>
          </div>
          <div class='feature-item' style='display: flex; align-items: center; padding: 1rem; background: #f8f9fa; border-radius: 8px;'>
            <i class='fas fa-building feature-icon' style='font-size: 24px; color: #007bff; margin-right: 12px;'></i>
            <div>
              <h3 style='margin: 0; font-size: 18px;'>${property.propertyType || property.type || property.houseType || 'Apartment'}</h3>
              <p style='margin: 0; color: #666; font-size: 14px;'>Property Type</p>
            </div>
          </div>
        </div>
        
        ${property.securityFee || property.deposit ? `
          <div class='additional-costs' style='background: #fff3cd; padding: 1rem; border-radius: 8px; border-left: 4px solid #ffc107; margin-bottom: 1.5rem;'>
            <h3 style='margin: 0 0 0.5rem 0; color: #856404;'>Additional Costs</h3>
            ${property.securityFee ? `<p style='margin: 0.25rem 0;'><strong>Security Fee:</strong> P${formatPrice(property.securityFee)}</p>` : ''}
            ${property.deposit ? `<p style='margin: 0.25rem 0;'><strong>Deposit:</strong> P${formatPrice(property.deposit)}</p>` : ''}
          </div>
        ` : ''}
      </div>
      
      <div class='property-description' style='margin-bottom: 2rem;'>
        <h2 class='section-title' style='margin-bottom: 1rem; color: #333; border-bottom: 2px solid #007bff; padding-bottom: 0.5rem;'>Description</h2>
        <div style='background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);'>
          <p style='line-height: 1.6; margin: 0;'>${property.description || property.details || 'No description provided by the landlord.'}</p>
        </div>
      </div>
      
      <div class='property-amenities' style='margin-bottom: 2rem;'>
        <h2 class='section-title' style='margin-bottom: 1rem; color: #333; border-bottom: 2px solid #007bff; padding-bottom: 0.5rem;'>Amenities & Features</h2>
        <div class='amenities-list' style='background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);'>
          ${amenities.length > 0 ? 
            `<div style='display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;'>
              ${amenities.map(amenity => 
                `<div class='amenity-item' style='display: flex; align-items: center; padding: 0.75rem; background: #f8f9fa; border-radius: 6px;'>
                  <i class='fas fa-${getAmenityIcon(amenity.name || amenity)} amenity-icon' style='color: #28a745; margin-right: 10px; font-size: 16px;'></i>
                  <span>${amenity.name || amenity}</span>
                </div>`
              ).join('')}
            </div>` : 
            '<p style="margin: 0; color: #666;">No amenities listed by the landlord.</p>'
          }
        </div>
      </div>
      
      ${property.rules || property.houseRules ? `
        <div class='property-rules' style='margin-bottom: 2rem;'>
          <h2 class='section-title' style='margin-bottom: 1rem; color: #333; border-bottom: 2px solid #007bff; padding-bottom: 0.5rem;'>House Rules</h2>
          <div style='background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);'>
            <p style='line-height: 1.6; margin: 0;'>${property.rules || property.houseRules}</p>
          </div>
        </div>
      ` : ''}
      
      <div class='property-actions' style='margin: 2rem 0; padding: 1.5rem; background: #f8f9fa; border-radius: 8px; text-align: center;'>
        <button id='savePropertyBtn' class='btn btn-secondary' onclick='toggleSaveProperty()' style='margin-right: 1rem; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;'>
          <i class='far fa-heart'></i> <span id='saveButtonText'>Save Property</span>
        </button>
        <button class='btn btn-primary' onclick='scrollToContact()' style='padding: 12px 24px; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;'>
          <i class='fas fa-paper-plane'></i> Contact Landlord
        </button>
      </div>
    `;
  }

  function getAmenityIcon(amenity) {
    const amenityLower = amenity.toLowerCase();
    const iconMap = {
      'wifi': 'wifi',
      'internet': 'wifi',
      'parking': 'car',
      'kitchen': 'utensils',
      'tv': 'tv',
      'television': 'tv',
      'air conditioning': 'wind',
      'ac': 'wind',
      'laundry': 'tshirt',
      'washing machine': 'tshirt',
      'gym': 'dumbbell',
      'pool': 'swimming-pool',
      'balcony': 'building',
      'garden': 'tree',
      'security': 'shield-alt',
      'furnished': 'couch',
      'heating': 'fire',
      'elevator': 'elevator'
    };
    
    return iconMap[amenityLower] || 'check';
  }

  // Keep all your existing helper functions (formatPrice, formatAmenities, etc.)
  function formatPrice(price) {
    if (!price) return '0';
    return parseFloat(price).toLocaleString();
  }

  function formatAmenities(amenities) {
    if (!Array.isArray(amenities)) {
      if (typeof amenities === 'string') {
        // Handle comma-separated string of amenities
        return amenities.split(',').map(a => a.trim()).filter(a => a);
      }
      return [];
    }
    
    return amenities.map(amenity => {
      if (typeof amenity === 'string') {
        return { name: amenity, icon: 'home' };
      }
      return amenity;
    });
  }

  // Continue with all your existing functions...
  // (Keep setupContactForms, fetchSimilarProperties, toggleSaveProperty, etc. exactly as they are)
});

// How to link from marketplace to this property details page:
// In your marketplace.js, when creating property cards, add click handlers like this:

/*
function createPropertyCard(property) {
  const card = document.createElement('div');
  card.className = 'property-card';
  card.innerHTML = `
    <img src="${property.imageUrl || '/img/default-property.jpg'}" alt="${property.title}" />
    <div class="property-info">
      <h3>${property.title || property.name}</h3>
      <p class="location"><i class="fas fa-map-marker-alt"></i> ${property.location}</p>
      <p class="rent">P${formatPrice(property.rent || property.price)}/month</p>
      <p class="type">${property.propertyType || property.type}</p>
      <button class="view-details-btn" onclick="viewPropertyDetails('${property.id}')">
        View Details
      </button>
    </div>
  `;
  return card;
}

function viewPropertyDetails(propertyId) {
  // Navigate to property details page with the specific property ID
  window.location.href = `property-details.html?id=${propertyId}`;
}
*/