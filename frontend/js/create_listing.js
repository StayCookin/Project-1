// Firebase v9+ imports
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  // Your Firebase config goes here
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

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

  // Check if user is authenticated and is a landlord
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      console.warn("No authenticated user found");
      showError("You must be logged in to add properties.");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 2000);
      return;
    }

    try {
      // Check role in Firestore with better error handling
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        throw new Error("User profile not found");
      }
      
      const userData = userDoc.data();
      if (!userData || userData.role !== "landlord") {
        showError("Only landlords can add properties.");
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
      
    } catch (error) {
      console.error("Error checking user role:", error);
      showError("Error verifying user permissions. Please try logging in again.");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 2000);
    }
  });

  // Setup form submission handler
  function setupFormSubmission(form, submitButton, user) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      // Show loading state
      setButtonLoadingState(submitButton, true, "Adding Property...");

      try {
        // Collect and validate form data
        const formData = collectFormData(form);
        
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
          price: Number(formData.rentPrice),
          securityFee: Number(formData.securityFee),
          amenities: formData.amenities,
          location: formData.propertyLocation,
          address: formData.address || formData.propertyLocation,
          imageUrl: imageUrl,
          images: imageUrl ? [imageUrl] : [], // Array for future multiple images
          landlordId: user.uid,
          landlordEmail: user.email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          status: 'active',
          featured: false,
          viewCount: 0
        };

        showProgress("Saving property...");
        
        // Add property to Firestore
        const docRef = await addPropertyToFirestore(propertyData);
        
        showSuccess(`Property added successfully! Property ID: ${docRef.id}`);
        
        // Reset form
        form.reset();
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
      propertyLocation: getFormValue(form, ["propertyLocation", "location", "property-location", "address"]),
      address: getFormValue(form, ["address", "full-address", "street-address"]),
      imageFile: getFormFile(form, ["propertyImage", "image", "property-image", "photo"]),
      amenities: collectAmenities(form)
    };

    return formData;
  }

  // Helper function to safely get form values with multiple possible field names
  function getFormValue(form, fieldNames) {
    if (typeof fieldNames === 'string') {
      fieldNames = [fieldNames];
    }

    for (const fieldName of fieldNames) {
      const field = form.elements[fieldName] || form.querySelector(`[name="${fieldName}"]`) || 
                   form.querySelector(`#${fieldName}`);
      if (field && field.value) {
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
      const field = form.elements[fieldName] || form.querySelector(`[name="${fieldName}"]`) || 
                   form.querySelector(`#${fieldName}`);
      if (field && field.files && field.files[0]) {
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
      // Try to find checkboxes or radio buttons for amenities
      const checkboxes = form.querySelectorAll('input[type="checkbox"][name*="amenity" i], input[type="checkbox"][value*="wifi" i], input[type="checkbox"][value*="parking" i], input[type="checkbox"][value*="gym" i]');
      if (checkboxes.length > 0) {
        amenities = Array.from(checkboxes)
          .filter(checkbox => checkbox.checked)
          .map(checkbox => ({
            name: checkbox.value || checkbox.getAttribute('data-name') || 'Unknown Amenity',
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
          name: opt.text || opt.value,
          value: opt.value,
          icon: generateAmenityIcon(opt.value)
        }));
      } else if (amenitiesElement.value) {
        // Single select dropdown
        const selectedOption = amenitiesElement.options[amenitiesElement.selectedIndex];
        amenities = [{
          name: selectedOption.text || selectedOption.value,
          value: selectedOption.value,
          icon: generateAmenityIcon(selectedOption.value)
        }];
      }
    } else if (amenitiesElement.type === "checkbox" && amenitiesElement.checked) {
      // Single checkbox
      amenities = [{
        name: amenitiesElement.value,
        value: amenitiesElement.value,
        icon: generateAmenityIcon(amenitiesElement.value)
      }];
    }

    return amenities;
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
      'air conditioning': 'snowflake',
      'ac': 'snowflake',
      'heating': 'thermometer',
      'security': 'shield',
      'elevator': 'move-vertical',
      'balcony': 'trees',
      'garden': 'leaf'
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
    }

    if (!formData.propertyLocation) {
      errors.push("Property location is required");
    }

    // Validate numeric fields
    if (!formData.rentPrice) {
      errors.push("Rent price is required");
    } else if (isNaN(formData.rentPrice) || Number(formData.rentPrice) <= 0) {
      errors.push("Please enter a valid rent price (must be greater than 0)");
    }

    if (!formData.securityFee) {
      errors.push("Security fee is required");
    } else if (isNaN(formData.securityFee) || Number(formData.securityFee) < 0) {
      errors.push("Please enter a valid security fee (must be 0 or greater)");
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
      if (error.code === 'storage/unauthorized') {
        throw new Error("You don't have permission to upload images. Please check your account settings.");
      } else if (error.code === 'storage/canceled') {
        throw new Error("Image upload was canceled. Please try again.");
      } else if (error.code === 'storage/unknown') {
        throw new Error("An unknown error occurred during image upload. Please try again.");
      }
      throw new Error(`Image upload failed: ${error.message}`);
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
      if (error.code === 'permission-denied') {
        throw new Error("You don't have permission to add properties. Please check your account role.");
      } else if (error.code === 'unavailable') {
        throw new Error("Service temporarily unavailable. Please try again in a moment.");
      }
      throw new Error(`Failed to save property: ${error.message}`);
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
      button.textContent = loadingText || "Loading...";
    } else {
      button.disabled = false;
      button.textContent = button.dataset.originalText || "Add Property";
    }
  }

  function showError(message) {
    const errorContainer = document.getElementById("errorContainer") || createMessageContainer();
    errorContainer.innerHTML = `<div class="error-message" style="color: #dc3545; padding: 12px; margin: 12px 0; border: 1px solid #dc3545; border-radius: 6px; background-color: #f8d7da; font-weight: 500;">${message.replace(/\n/g, '<br>')}</div>`;
    errorContainer.scrollIntoView({ behavior: 'smooth' });
    
    // Auto-hide after 8 seconds for errors
    setTimeout(() => {
      if (errorContainer) {
        errorContainer.innerHTML = "";
      }
    }, 8000);
  }

  function showSuccess(message) {
    const successContainer = document.getElementById("errorContainer") || createMessageContainer();
    successContainer.innerHTML = `<div class="success-message" style="color: #155724; padding: 12px; margin: 12px 0; border: 1px solid #c3e6cb; border-radius: 6px; background-color: #d4edda; font-weight: 500;">${message}</div>`;
    successContainer.scrollIntoView({ behavior: 'smooth' });
    
    // Auto-hide after 5 seconds for success
    setTimeout(() => {
      if (successContainer) {
        successContainer.innerHTML = "";
      }
    }, 5000);
  }

  function showProgress(message) {
    const progressContainer = document.getElementById("progressContainer") || createProgressContainer();
    progressContainer.innerHTML = `<div class="progress-message" style="color: #0c5460; padding: 10px; margin: 10px 0; border: 1px solid #bee5eb; border-radius: 6px; background-color: #d1ecf1;">${message}</div>`;
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
});