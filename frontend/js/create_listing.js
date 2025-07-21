// Import Firebase configuration
import "../js/firebase-config.js";

document.addEventListener("DOMContentLoaded", function () {
  // Add loading state management
  const submitButton = document.querySelector('button[type="submit"]') || document.querySelector('input[type="submit"]');
  
  // Check if user is authenticated and is a landlord
  firebase.auth().onAuthStateChanged(async function (user) {
    if (!user) {
      console.warn("No authenticated user found");
      window.location.href = "login.html";
      return;
    }

    try {
      // Check role in Firestore with better error handling
      const userDoc = await firebase
        .firestore()
        .collection("users")
        .doc(user.uid)
        .get();
      
      if (!userDoc.exists) {
        throw new Error("User document not found");
      }
      
      const userData = userDoc.data();
      if (!userData || userData.role !== "landlord") {
        alert("Only landlords can add properties.");
        window.location.href = "index.html";
        return;
      }

      console.log("Landlord authenticated successfully");
      
    } catch (error) {
      console.error("Error checking user role:", error);
      alert("Error verifying user permissions. Please try again.");
      window.location.href = "index.html";
      return;
    }

    // Handle form submission
    const form = document.querySelector("form");
    if (!form) {
      console.error("Form not found on page");
      return;
    }

    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      // Disable submit button during processing
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Adding Property...";
      }

      try {
        // Collect form data with better validation
        const formData = collectFormData(form);
        
        if (!validateFormData(formData)) {
          return;
        }

        // Handle image upload if present
        let imageUrl = "";
        if (formData.imageFile) {
          imageUrl = await uploadImage(formData.imageFile, user.uid);
        }

        // Add property to Firestore
        await addPropertyToFirestore({
          title: formData.propertyName,
          price: Number(formData.rentPrice),
          securityFee: Number(formData.securityFee),
          amenities: formData.amenities,
          location: formData.propertyLocation,
          imageUrl: imageUrl,
          landlordId: user.uid,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          status: 'active' // Add property status
        });

        alert("Property added successfully!");
        form.reset();
        
        // Optionally redirect to dashboard
        // window.location.href = "landlord-dashboard.html";
        
      } catch (error) {
        console.error("Error adding property:", error);
        alert(`Failed to add property: ${error.message}`);
      } finally {
        // Re-enable submit button
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = "Add Property";
        }
      }
    });
  });

  // Helper function to collect form data
  function collectFormData(form) {
    const formData = {
      propertyName: getFormValue(form, "propertyName"),
      rentPrice: getFormValue(form, "rentPrice"),
      securityFee: getFormValue(form, "securityFee"),
      propertyLocation: getFormValue(form, "propertyLocation"),
      imageFile: getFormFile(form, "propertyImage"),
      amenities: collectAmenities(form)
    };

    return formData;
  }

  // Helper function to safely get form values
  function getFormValue(form, fieldName) {
    const field = form.elements[fieldName];
    return field ? field.value.trim() : "";
  }

  // Helper function to safely get form files
  function getFormFile(form, fieldName) {
    const field = form.elements[fieldName];
    return field && field.files && field.files[0] ? field.files[0] : null;
  }

  // Improved amenities collection
  function collectAmenities(form) {
    const amenitiesSelect = form.elements["amenities"];
    let amenities = [];

    if (!amenitiesSelect) {
      return amenities;
    }

    // Handle different types of amenities inputs
    if (amenitiesSelect.type === "select-multiple" && amenitiesSelect.selectedOptions) {
      // Multiple select dropdown
      amenities = Array.from(amenitiesSelect.selectedOptions).map((opt) => ({
        name: opt.text || opt.value,
        value: opt.value,
        icon: opt.value.toLowerCase().replace(/\s+/g, '-')
      }));
    } else if (amenitiesSelect.type === "select-one" && amenitiesSelect.value) {
      // Single select dropdown
      const selectedOption = amenitiesSelect.options[amenitiesSelect.selectedIndex];
      amenities = [{
        name: selectedOption.text || selectedOption.value,
        value: selectedOption.value,
        icon: selectedOption.value.toLowerCase().replace(/\s+/g, '-')
      }];
    } else if (amenitiesSelect.type === "checkbox") {
      // Single checkbox
      if (amenitiesSelect.checked) {
        amenities = [{
          name: amenitiesSelect.value,
          value: amenitiesSelect.value,
          icon: amenitiesSelect.value.toLowerCase().replace(/\s+/g, '-')
        }];
      }
    } else {
      // Handle multiple checkboxes with same name
      const checkboxes = form.querySelectorAll('input[name="amenities"]:checked');
      amenities = Array.from(checkboxes).map(checkbox => ({
        name: checkbox.value,
        value: checkbox.value,
        icon: checkbox.value.toLowerCase().replace(/\s+/g, '-')
      }));
    }

    return amenities;
  }

  // Improved form validation
  function validateFormData(formData) {
    const requiredFields = ['propertyName', 'rentPrice', 'securityFee', 'propertyLocation'];
    const missingFields = [];

    // Check required text fields
    requiredFields.forEach(field => {
      if (!formData[field]) {
        missingFields.push(field.replace(/([A-Z])/g, ' $1').toLowerCase());
      }
    });

    // Validate numeric fields
    if (formData.rentPrice && (isNaN(formData.rentPrice) || Number(formData.rentPrice) <= 0)) {
      alert("Please enter a valid rent price.");
      return false;
    }

    if (formData.securityFee && (isNaN(formData.securityFee) || Number(formData.securityFee) < 0)) {
      alert("Please enter a valid security fee.");
      return false;
    }

    // Check if amenities are selected
    if (!formData.amenities || formData.amenities.length === 0) {
      missingFields.push("amenities");
    }

    // Validate image file if present
    if (formData.imageFile) {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!validTypes.includes(formData.imageFile.type)) {
        alert("Please upload a valid image file (JPEG, PNG, or WebP).");
        return false;
      }

      if (formData.imageFile.size > maxSize) {
        alert("Image file size must be less than 5MB.");
        return false;
      }
    }

    if (missingFields.length > 0) {
      alert(`Please fill in the following fields: ${missingFields.join(', ')}`);
      return false;
    }

    return true;
  }

  // Improved image upload with progress tracking
  async function uploadImage(imageFile, userId) {
    try {
      // Check if Firebase Storage is available
      if (!firebase.storage) {
        throw new Error("Firebase Storage is not configured");
      }

      const storageRef = firebase.storage().ref();
      const timestamp = Date.now();
      const fileName = `${userId}_${timestamp}_${imageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const fileRef = storageRef.child(`property-images/${fileName}`);

      // Upload file with metadata
      const metadata = {
        contentType: imageFile.type,
        customMetadata: {
          uploadedBy: userId,
          uploadedAt: new Date().toISOString()
        }
      };

      console.log("Uploading image...");
      const uploadTask = await fileRef.put(imageFile, metadata);
      console.log("Image uploaded successfully");
      
      const downloadURL = await fileRef.getDownloadURL();
      console.log("Download URL obtained:", downloadURL);
      
      return downloadURL;
    } catch (error) {
      console.error("Image upload error:", error);
      throw new Error(`Image upload failed: ${error.message}`);
    }
  }

  // Improved Firestore operation
  async function addPropertyToFirestore(propertyData) {
    try {
      // Check if Firestore is available
      if (!firebase.firestore) {
        throw new Error("Firebase Firestore is not configured");
      }

      console.log("Adding property to Firestore...");
      const docRef = await firebase
        .firestore()
        .collection("properties")
        .add(propertyData);
      
      console.log("Property added with ID:", docRef.id);
      return docRef.id;
    } catch (error) {
      console.error("Firestore error:", error);
      throw new Error(`Failed to save property: ${error.message}`);
    }
  }
});