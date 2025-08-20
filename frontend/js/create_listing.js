// Firebase v9+ imports
import { initializeApp } from 'firebase/app';
import { getAuth,getAuthEmulator, onAuthStateChanged } from 'firebase/auth';
import { getFirestore,getFirestoreEmulator, collection, addDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';


const firebaseConfig = {
  
  apiKey: "AIzaSyAXKk5gRjwSGK_g9f_HP_f4y4445e_8l4w",
  authDomain: "project-1-1e31c.firebaseapp.com",
  projectId: "project-1-1e31c",
  storageBucket: "project-1-1e31c.firebasestorage.app",
  messagingSenderId: "658275930203",
  appId: "1:658275930203:web:afc2e2a249509737b0ef7e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

if (location.hostname === "localhost"){
  connectAuthEmulator(auth, "http://localhost:5500");
  connectFirestoreEmulator(db, "localhost", 8080);
}

document.addEventListener("DOMContentLoaded", function () {
  // Get form and submit button references
  const form = document.querySelector("form");
  const submitButton = document.querySelector('button[type="submit"]') || 
                      document.querySelector('input[type="submit"]') || 
                      document.getElementById('submitBtn');
  
  if (!form) {
    console.error("Form not found on page");
    showError("Form element not found. Please check the page structure.");
    return;
  }

  // Initialize authentication state tracking
  let currentUser = null;
  let isAuthChecked = false;

  // Check if user is authenticated and is a landlord
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    try {
      if (!user) {
        console.warn("No authenticated user found");
        showError("You must be logged in to add properties.");
        setTimeout(() => {
          window.location.href = "login.html";
        }, 2000);
        return;
      }

      // Store current user
      currentUser = user;

      // Check role in Firestore with better error handling
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        throw new Error("User profile not found. Please complete your profile setup.");
      }
      
      const userData = userDoc.data();
      if (!userData || userData.role !== "landlord") {
        showError("Only landlords can add properties. Please contact support if you believe this is an error.");
        setTimeout(() => {
          window.location.href = "index.html";
        }, 2000);
        return;
      }

      console.log("Landlord authenticated successfully");
      
      // Pre-fill form if user data is available
      prefillUserData(form, userData, user);
      
      // Enable form submission
      setupFormSubmission(form, submitButton, user);
      
      // Mark auth as checked
      isAuthChecked = true;
      
    } catch (error) {
      console.error("Error checking user role:", error);
      showError(`Error verifying user permissions: ${error.message}. Please try logging in again.`);
      setTimeout(() => {
        window.location.href = "login.html";
      }, 2000);
    }
  });

  // Setup form submission handler
  function setupFormSubmission(form, submitButton, user) {
    // Remove any existing listeners to prevent duplicates
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    newForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      // Double-check authentication before submission
      if (!currentUser || !isAuthChecked) {
        showError("Please wait for authentication verification to complete.");
        return;
      }

      // Show loading state
      setButtonLoadingState(submitButton, true, "Adding Property...");

      try {
        // Collect and validate form data
        const formData = collectFormData(newForm);
        
        if (!validateFormData(formData)) {
          return;
        }

        // Handle image upload if present
        let imageUrl = "";
        if (formData.imageFile) {
          showProgress("Uploading image...");
          imageUrl = await uploadImage(formData.imageFile, user.uid);
        }

        // Prepare property data for Firestore
        const propertyData = {
          title: formData.propertyName,
          description: formData.description || "",
          price: parseFloat(formData.rentPrice),
          securityFee: parseFloat(formData.securityFee),
          amenities: formData.amenities,
          location: formData.propertyLocation,
          address: formData.address || formData.propertyLocation,
          imageUrl: imageUrl,
          images: imageUrl ? [imageUrl] : [], // Array for future multiple images
          landlordId: user.uid,
          landlordEmail: user.email,
          landlordName: formData.landlordName || user.displayName || "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          status: 'active',
          featured: false,
          viewCount: 0,
          // Additional useful fields
          propertyType: formData.propertyType || "apartment",
          bedrooms: parseInt(formData.bedrooms) || 1,
          bathrooms: parseInt(formData.bathrooms) || 1,
          available: true,
          dateAvailable: formData.dateAvailable ? new Date(formData.dateAvailable) : new Date()
        };

        showProgress("Saving property...");
        
        // Add property to Firestore
        const docRef = await addPropertyToFirestore(propertyData);
        
        showSuccess(`Property added successfully! Property ID: ${docRef.id}`);
        
        
        // Reset form
        newForm.reset();
        clearProgress();
        
        // Optional: Redirect to dashboard after delay
        setTimeout(() => {
          const shouldRedirect = confirm("Property added successfully! Would you like to go to your dashboard?");
          if (shouldRedirect) {
            window.location.href = "landlord-dashboard.html";
          }
        }, 1500);
        
      } catch (error) {
        console.error("Error adding property:", error);
        showError(`Failed to add property: ${error.message}`);
      } finally {
        // Reset button state
        setButtonLoadingState(submitButton, false, "Add Property");
        clearProgress();
      }
    });
  }

  // Helper function to collect form data with flexible field names
  function collectFormData(form) {
    const formData = {
      propertyName: getFormValue(form, ["propertyName", "title", "property-name", "name"]),
      description: getFormValue(form, ["description", "property-description", "desc"]),
      rentPrice: getFormValue(form, ["rentPrice", "price", "rent-price", "rent"]),
      securityFee: getFormValue(form, ["securityFee", "security-fee", "deposit"]),
      propertyLocation: getFormValue(form, ["propertyLocation", "location", "property-location"]),
      address: getFormValue(form, ["address", "full-address", "street-address"]),
      imageFile: getFormFile(form, ["propertyImage", "image", "property-image", "photo"]),
      amenities: collectAmenities(form),
      // Additional fields
      propertyType: getFormValue(form, ["propertyType", "property-type", "type"]),
      bedrooms: getFormValue(form, ["bedrooms", "beds", "bedroom-count"]),
      bathrooms: getFormValue(form, ["bathrooms", "baths", "bathroom-count"]),
      dateAvailable: getFormValue(form, ["dateAvailable", "available-date", "move-in-date"]),
      landlordName: getFormValue(form, ["landlordName", "landlord-name", "contact-name"])
    };

    return formData;
  }

  // Helper function to safely get form values with multiple possible field names
  function getFormValue(form, fieldNames) {
    if (typeof fieldNames === 'string') {
      fieldNames = [fieldNames];
    }

    for (const fieldName of fieldNames) {
      const field = form.elements[fieldName] || 
                   form.querySelector(`[name="${fieldName}"]`) || 
                   form.querySelector(`#${fieldName}`);
      if (field && field.value !== undefined && field.value !== null) {
        return field.value.trim();
      }
    }
    return "";
  }

  // Helper function to safely get form files with multiple possible field names
  function getFormFile(form, fieldNames) {
    if (typeof fieldNames === 'string') {
      fieldNames = [fieldNames];
    }

    for (const fieldName of fieldNames) {
      const field = form.elements[fieldName] || 
                   form.querySelector(`[name="${fieldName}"]`) || 
                   form.querySelector(`#${fieldName}`);
      if (field && field.files && field.files.length > 0) {
        return field.files[0];
      }
    }
    return null;
  }

  // Enhanced amenities collection with multiple input types support
  function collectAmenities(form) {
    let amenities = [];

    // Try multiple possible selectors for amenities
    const possibleSelectors = [
      'select[name="amenities"]',
      'select[name="amenity"]', 
      '#amenities',
      'input[name="amenities"]',
      'input[name="amenity"]'
    ];

    let amenitiesElement = null;
    for (const selector of possibleSelectors) {
      amenitiesElement = form.querySelector(selector);
      if (amenitiesElement) break;
    }

    if (!amenitiesElement) {
      // Try to find checkboxes for amenities
      const checkboxes = form.querySelectorAll(`
        input[type="checkbox"][name*="amenity" i], 
        input[type="checkbox"][name*="feature" i],
        input[type="checkbox"][value*="wifi" i], 
        input[type="checkbox"][value*="parking" i], 
        input[type="checkbox"][value*="gym" i],
        input[type="checkbox"][value*="pool" i],
        input[type="checkbox"][value*="laundry" i]
      `);
      
      if (checkboxes.length > 0) {
        amenities = Array.from(checkboxes)
          .filter(checkbox => checkbox.checked)
          .map(checkbox => ({
            name: getAmenityDisplayName(checkbox.value) || checkbox.getAttribute('data-name') || checkbox.value,
            value: checkbox.value,
            icon: generateAmenityIcon(checkbox.value)
          }));
        return amenities;
      }
      return [];
    }

    // Handle different types of amenities inputs
    if (amenitiesElement.tagName === 'SELECT') {
      if (amenitiesElement.multiple) {
        // Multiple select dropdown
        amenities = Array.from(amenitiesElement.selectedOptions).map((opt) => ({
          name: getAmenityDisplayName(opt.value) || opt.text,
          value: opt.value,
          icon: generateAmenityIcon(opt.value)
        }));
      } else if (amenitiesElement.value) {
        // Single select dropdown
        const selectedOption = amenitiesElement.options[amenitiesElement.selectedIndex];
        amenities = [{
          name: getAmenityDisplayName(selectedOption.value) || selectedOption.text,
          value: selectedOption.value,
          icon: generateAmenityIcon(selectedOption.value)
        }];
      }
    } else if (amenitiesElement.type === "checkbox" && amenitiesElement.checked) {
      // Single checkbox
      amenities = [{
        name: getAmenityDisplayName(amenitiesElement.value) || amenitiesElement.value,
        value: amenitiesElement.value,
        icon: generateAmenityIcon(amenitiesElement.value)
      }];
    }

    return amenities;
  }

  // Get proper display name for amenities
  function getAmenityDisplayName(value) {
    const displayNames = {
      'wifi': 'Wi-Fi',
      'internet': 'Internet Access',
      'parking': 'Parking',
      'gym': 'Fitness Center',
      'fitness': 'Fitness Center',
      'pool': 'Swimming Pool',
      'swimming': 'Swimming Pool',
      'laundry': 'Laundry Facility',
      'washing': 'Washing Machine',
      'kitchen': 'Full Kitchen',
      'air-conditioning': 'Air Conditioning',
      'ac': 'Air Conditioning',
      'heating': 'Heating',
      'security': '24/7 Security',
      'elevator': 'Elevator Access',
      'balcony': 'Balcony',
      'garden': 'Garden Access',
      'pet-friendly': 'Pet Friendly',
      'furnished': 'Furnished'
    };
    
    return displayNames[value.toLowerCase()] || null;
  }

  // Generate appropriate icons for amenities
  function generateAmenityIcon(amenityValue) {
    const amenityLower = amenityValue.toLowerCase();
    const iconMap = {
      'wifi': 'wifi',
      'internet': 'wifi',
      'parking': 'car',
      'gym': 'dumbbell',
      'fitness': 'dumbbell',
      'pool': 'waves',
      'swimming': 'waves',
      'laundry': 'shirt',
      'washing': 'shirt',
      'kitchen': 'chef-hat',
      'air-conditioning': 'snowflake',
      'ac': 'snowflake',
      'heating': 'thermometer',
      'security': 'shield',
      'elevator': 'move-vertical',
      'balcony': 'trees',
      'garden': 'leaf',
      'pet-friendly': 'heart',
      'furnished': 'sofa'
    };

    for (const [key, icon] of Object.entries(iconMap)) {
      if (amenityLower.includes(key)) {
        return icon;
      }
    }
    return 'home';
  }

  // Enhanced form validation with better error messages
  function validateFormData(formData) {
    const errors = [];

    // Check required text fields
    if (!formData.propertyName) {
      errors.push("Property name/title is required");
    } else if (formData.propertyName.length < 3) {
      errors.push("Property name must be at least 3 characters long");
    }

    if (!formData.propertyLocation) {
      errors.push("Property location is required");
    }

    // Validate numeric fields with better error handling
    if (!formData.rentPrice) {
      errors.push("Rent price is required");
    } else {
      const rentPrice = parseFloat(formData.rentPrice);
      if (isNaN(rentPrice) || rentPrice <= 0) {
        errors.push("Please enter a valid rent price (must be greater than 0)");
      } else if (rentPrice > 1000000) {
        errors.push("Rent price seems unusually high. Please verify the amount.");
      }
    }

    if (!formData.securityFee) {
      errors.push("Security fee is required");
    } else {
      const securityFee = parseFloat(formData.securityFee);
      if (isNaN(securityFee) || securityFee < 0) {
        errors.push("Please enter a valid security fee (must be 0 or greater)");
      }
    }

    // Validate bedrooms and bathrooms if provided
    if (formData.bedrooms && (isNaN(parseInt(formData.bedrooms)) || parseInt(formData.bedrooms) < 0)) {
      errors.push("Please enter a valid number of bedrooms");
    }

    if (formData.bathrooms && (isNaN(parseInt(formData.bathrooms)) || parseInt(formData.bathrooms) < 0)) {
      errors.push("Please enter a valid number of bathrooms");
    }

    // Check if amenities are selected
    if (!formData.amenities || formData.amenities.length === 0) {
      errors.push("Please select at least one amenity");
    }

    // Validate image file if present
    if (formData.imageFile) {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!validTypes.includes(formData.imageFile.type)) {
        errors.push("Please upload a valid image file (JPEG, PNG, or WebP)");
      } else if (formData.imageFile.size > maxSize) {
        errors.push("Image file size must be less than 5MB");
      }
    }

    // Validate date if provided
    if (formData.dateAvailable) {
      const availableDate = new Date(formData.dateAvailable);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day
      
      if (isNaN(availableDate.getTime())) {
        errors.push("Please provide a valid available date");
      } else if (availableDate < today) {
        errors.push("Available date cannot be in the past");
      }
    }

    if (errors.length > 0) {
      showError("Please fix the following errors:\n• " + errors.join("\n• "));
      return false;
    }

    return true;
  }

  // Enhanced image upload with better error handling and progress
  async function uploadImage(imageFile, userId) {
    try {
      const timestamp = Date.now();
      const sanitizedFileName = imageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${userId}_${timestamp}_${sanitizedFileName}`;
      const imageRef = ref(storage, `property-images/${fileName}`);

      // Upload file with metadata
      const metadata = {
        contentType: imageFile.type,
        customMetadata: {
          uploadedBy: userId,
          uploadedAt: new Date().toISOString(),
          originalName: imageFile.name
        }
      };

      console.log("Starting image upload...");
      const uploadResult = await uploadBytes(imageRef, imageFile, metadata);
      console.log("Image uploaded successfully");
      
      const downloadURL = await getDownloadURL(uploadResult.ref);
      console.log("Download URL obtained:", downloadURL);
      
      return downloadURL;
    } catch (error) {
      console.error("Image upload error:", error);
      
      // Provide more specific error messages
      switch (error.code) {
        case 'storage/unauthorized':
          throw new Error("You don't have permission to upload images. Please check your account settings.");
        case 'storage/canceled':
          throw new Error("Image upload was canceled. Please try again.");
        case 'storage/quota-exceeded':
          throw new Error("Storage quota exceeded. Please contact support.");
        case 'storage/invalid-format':
          throw new Error("Invalid image format. Please use JPEG, PNG, or WebP.");
        case 'storage/unknown':
          throw new Error("An unknown error occurred during image upload. Please try again.");
        default:
          throw new Error(`Image upload failed: ${error.message}`);
      }
    }
  }

  // Enhanced Firestore operation with better error handling
  async function addPropertyToFirestore(propertyData) {
    try {
      console.log("Adding property to Firestore...", propertyData);
      const docRef = await addDoc(collection(db, "properties"), propertyData);
      console.log("Property added with ID:", docRef.id);
      return docRef;
    } catch (error) {
      console.error("Firestore error:", error);
      
      // Provide more specific error messages
      switch (error.code) {
        case 'permission-denied':
          throw new Error("You don't have permission to add properties. Please check your account role.");
        case 'unavailable':
          throw new Error("Service temporarily unavailable. Please try again in a moment.");
        case 'deadline-exceeded':
          throw new Error("Request timed out. Please check your internet connection and try again.");
        case 'resource-exhausted':
          throw new Error("Too many requests. Please wait a moment and try again.");
        default:
          throw new Error(`Failed to save property: ${error.message}`);
      }
    }
  }

  // Pre-fill form with user data
  function prefillUserData(form, userData, user) {
    try {
      // Try to prefill email if there's an email field
      const emailField = form.querySelector('[name="email"], [name="contact-email"], #email');
      if (emailField && !emailField.value) {
        emailField.value = user.email || userData.email || '';
      }

      // Try to prefill name if there's a name field  
      const nameField = form.querySelector('[name="landlord-name"], [name="contact-name"], #landlord-name');
      if (nameField && !nameField.value && userData.name) {
        nameField.value = userData.name;
      }

      // Try to prefill phone if there's a phone field
      const phoneField = form.querySelector('[name="phone"], [name="contact-phone"], #phone');
      if (phoneField && !phoneField.value && userData.phone) {
        phoneField.value = userData.phone;
      }
    } catch (error) {
      console.warn("Could not prefill user data:", error);
    }
  }

  // UI Helper functions
  function setButtonLoadingState(button, isLoading, loadingText) {
    if (!button) return;
    
    if (isLoading) {
      button.disabled = true;
      button.dataset.originalText = button.textContent;
      button.innerHTML = `<span class="loading-spinner" style="display: inline-block; width: 16px; height: 16px; border: 2px solid #ffffff; border-radius: 50%; border-top-color: transparent; animation: spin 1s linear infinite; margin-right: 8px;"></span>${loadingText || "Loading..."}`;
    } else {
      button.disabled = false;
      button.textContent = button.dataset.originalText || "Add Property";
    }
  }

  function showError(message) {
    const errorContainer = document.getElementById("errorContainer") || createMessageContainer();
    errorContainer.innerHTML = `
      <div class="error-message" style="
        color: #dc3545; 
        padding: 12px; 
        margin: 12px 0; 
        border: 1px solid #dc3545; 
        border-radius: 6px; 
        background-color: #f8d7da; 
        font-weight: 500;
        position: relative;
      ">
        <strong>Error:</strong> ${message.replace(/\n/g, '<br>')}
        <button onclick="this.parentElement.style.display='none'" style="
          position: absolute;
          top: 8px;
          right: 8px;
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: #dc3545;
        ">&times;</button>
      </div>`;
    errorContainer.scrollIntoView({ behavior: 'smooth' });
    
    // Auto-hide after 10 seconds for errors
    setTimeout(() => {
      if (errorContainer && errorContainer.querySelector('.error-message')) {
        errorContainer.innerHTML = "";
      }
    }, 10000);
  }

  function showSuccess(message) {
    const successContainer = document.getElementById("errorContainer") || createMessageContainer();
    successContainer.innerHTML = `
      <div class="success-message" style="
        color: #155724; 
        padding: 12px; 
        margin: 12px 0; 
        border: 1px solid #c3e6cb; 
        border-radius: 6px; 
        background-color: #d4edda; 
        font-weight: 500;
        position: relative;
      ">
        <strong>Success:</strong> ${message}
        <button onclick="this.parentElement.style.display='none'" style="
          position: absolute;
          top: 8px;
          right: 8px;
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: #155724;
        ">&times;</button>
      </div>`;
    successContainer.scrollIntoView({ behavior: 'smooth' });
    
    // Auto-hide after 6 seconds for success
    setTimeout(() => {
      if (successContainer && successContainer.querySelector('.success-message')) {
        successContainer.innerHTML = "";
      }
    }, 6000);
  }

  function showProgress(message) {
    const progressContainer = document.getElementById("progressContainer") || createProgressContainer();
    progressContainer.innerHTML = `
      <div class="progress-message" style="
        color: #0c5460; 
        padding: 10px; 
        margin: 10px 0; 
        border: 1px solid #bee5eb; 
        border-radius: 6px; 
        background-color: #d1ecf1;
        display: flex;
        align-items: center;
      ">
        <span class="loading-spinner" style="
          display: inline-block; 
          width: 16px; 
          height: 16px; 
          border: 2px solid #0c5460; 
          border-radius: 50%; 
          border-top-color: transparent; 
          animation: spin 1s linear infinite; 
          margin-right: 8px;
        "></span>
        ${message}
      </div>`;
  }

  function clearProgress() {
    const progressContainer = document.getElementById("progressContainer");
    if (progressContainer) {
      progressContainer.innerHTML = "";
    }
  }

  function createMessageContainer() {
    let container = document.getElementById("errorContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "errorContainer";
      const form = document.querySelector("form");
      if (form) {
        form.parentNode.insertBefore(container, form);
      } else {
        document.body.insertBefore(container, document.body.firstChild);
      }
    }
    return container;
  }

  function createProgressContainer() {
    let container = document.getElementById("progressContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "progressContainer";
      const errorContainer = document.getElementById("errorContainer") || createMessageContainer();
      errorContainer.parentNode.insertBefore(container, errorContainer.nextSibling);
    }
    return container;
  }

  // Add CSS for spinner animation
  if (!document.querySelector('#spinner-styles')) {
    const styles = document.createElement('style');
    styles.id = 'spinner-styles';
    styles.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(styles);
  }

  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    if (unsubscribe) {
      unsubscribe();
    }
  });
});
