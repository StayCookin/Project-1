  import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
        import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
        import { getFirestore, collection, addDoc, doc, getDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
        import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js';

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
        const storage = getStorage(app);

        document.addEventListener("DOMContentLoaded", function () {
            const form = document.getElementById("propertyForm");
            const submitButton = document.getElementById("submitBtn");
            
            if (!form) {
                console.error("Form not found on page");
                showError("Form element not found. Please check the page structure.");
                return;
            }

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

                    currentUser = user;

                    // Check role in Firestore
                    const userDocRef = doc(db, "users", user.uid);
                    const userDoc = await getDoc(userDocRef);
                    
                    if (!userDoc.exists()) {
                        throw new Error("User profile not found. Please complete your profile setup.");
                    }
                    
                    const userData = userDoc.data();
                    if (!userData || userData.role !== "LANDLORD") {
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
                    
                    isAuthChecked = true;
                    
                } catch (error) {
                    console.error("Error checking user role:", error);
                    showError(`Error verifying user permissions: ${error.message}. Please try logging in again.`);
                    setTimeout(() => {
                        window.location.href = "login.html";
                    }, 2000);
                }
            });

            function setupFormSubmission(form, submitButton, user) {
                form.addEventListener("submit", async function (e) {
                    e.preventDefault();

                    if (!currentUser || !isAuthChecked) {
                        showError("Please wait for authentication verification to complete.");
                        return;
                    }

                    setButtonLoadingState(submitButton, true, "Adding Property...");

                    try {
                        const formData = collectFormData(form);
                        
                        if (!validateFormData(formData)) {
                            return;
                        }

                        let imageUrl = "";
                        if (formData.imageFile) {
                            showProgress("Uploading image...");
                            imageUrl = await uploadImage(formData.imageFile, user.uid);
                        }

                        const propertyData = {
                            title: formData.propertyName,
                            description: formData.description || "",
                            price: parseFloat(formData.rentPrice),
                            securityFee: parseFloat(formData.securityFee),
                            amenities: formData.amenities,
                            location: formData.propertyLocation,
                            address: formData.address || formData.propertyLocation,
                            imageUrl: imageUrl,
                            images: imageUrl ? [imageUrl] : [],
                            landlordId: user.uid,
                            landlordEmail: user.email,
                            landlordName: formData.landlordName || user.displayName || "",
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp(),
                            status: 'active',
                            featured: false,
                            viewCount: 0,
                            propertyType: formData.propertyType || "apartment",
                            bedrooms: parseInt(formData.bedrooms) || 1,
                            bathrooms: parseInt(formData.bathrooms) || 1,
                            available: true,
                            dateAvailable: formData.dateAvailable ? new Date(formData.dateAvailable) : new Date()
                        };

                        showProgress("Saving property...");
                        
                        const docRef = await addPropertyToFirestore(propertyData);
                        
                        showSuccess(`Property added successfully! Property ID: ${docRef.id}`);
                        
                        form.reset();
                        clearProgress();
                        
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
                        setButtonLoadingState(submitButton, false, "Add Property");
                        clearProgress();
                    }
                });
            }

            function collectFormData(form) {
                const formData = new FormData(form);
                
                // Collect amenities from checkboxes
                const amenities = [];
                const amenityCheckboxes = form.querySelectorAll('input[name="amenities"]:checked');
                amenityCheckboxes.forEach(checkbox => {
                    amenities.push({
                        name: getAmenityDisplayName(checkbox.value) || checkbox.nextElementSibling.textContent,
                        value: checkbox.value,
                        icon: generateAmenityIcon(checkbox.value)
                    });
                });

                return {
                    propertyName: formData.get('propertyName')?.trim() || '',
                    description: formData.get('description')?.trim() || '',
                    rentPrice: formData.get('rentPrice')?.trim() || '',
                    securityFee: formData.get('securityFee')?.trim() || '',
                    propertyLocation: formData.get('propertyLocation')?.trim() || '',
                    address: formData.get('address')?.trim() || '',
                    imageFile: formData.get('propertyImage'),
                    amenities: amenities,
                    propertyType: formData.get('propertyType') || 'apartment',
                    bedrooms: formData.get('bedrooms') || '',
                    bathrooms: formData.get('bathrooms') || '',
                    dateAvailable: formData.get('dateAvailable') || '',
                    landlordName: formData.get('landlordName')?.trim() || ''
                };
            }

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

            function validateFormData(formData) {
                const errors = [];

                if (!formData.propertyName) {
                    errors.push("Property name/title is required");
                } else if (formData.propertyName.length < 3) {
                    errors.push("Property name must be at least 3 characters long");
                }

                if (!formData.propertyLocation) {
                    errors.push("Property location is required");
                }

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

                if (formData.bedrooms && (isNaN(parseInt(formData.bedrooms)) || parseInt(formData.bedrooms) < 0)) {
                    errors.push("Please enter a valid number of bedrooms");
                }

                if (formData.bathrooms && (isNaN(parseInt(formData.bathrooms)) || parseInt(formData.bathrooms) < 0)) {
                    errors.push("Please enter a valid number of bathrooms");
                }

                if (!formData.amenities || formData.amenities.length === 0) {
                    errors.push("Please select at least one amenity");
                }

                if (formData.imageFile && formData.imageFile.size > 0) {
                    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                    const maxSize = 5 * 1024 * 1024; // 5MB

                    if (!validTypes.includes(formData.imageFile.type)) {
                        errors.push("Please upload a valid image file (JPEG, PNG, or WebP)");
                    } else if (formData.imageFile.size > maxSize) {
                        errors.push("Image file size must be less than 5MB");
                    }
                }

                if (formData.dateAvailable) {
                    const availableDate = new Date(formData.dateAvailable);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
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

            async function uploadImage(imageFile, userId) {
                try {
                    const timestamp = Date.now();
                    const sanitizedFileName = imageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                    const fileName = `${userId}_${timestamp}_${sanitizedFileName}`;
                    const imageRef = ref(storage, `property-images/${fileName}`);

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

            async function addPropertyToFirestore(propertyData) {
                try {
                    console.log("Adding property to Firestore...", propertyData);
                    const docRef = await addDoc(collection(db, "properties"), propertyData);
                    console.log("Property added with ID:", docRef.id);
                    return docRef;
                } catch (error) {
                    console.error("Firestore error:", error);
                    
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

            function prefillUserData(form, userData, user) {
                try {
                    const emailField = form.querySelector('[name="email"], [name="contact-email"], #email');
                    if (emailField && !emailField.value) {
                        emailField.value = user.email || userData.email || '';
                    }

                    const nameField = form.querySelector('[name="landlordName"], [name="contact-name"], #landlordName');
                    if (nameField && !nameField.value && userData.name) {
                        nameField.value = userData.name;
                    }

                    const phoneField = form.querySelector('[name="phone"], [name="contact-phone"], #phone');
                    if (phoneField && !phoneField.value && userData.phone) {
                        phoneField.value = userData.phone;
                    }
                } catch (error) {
                    console.warn("Could not prefill user data:", error);
                }
            }

            function setButtonLoadingState(button, isLoading, loadingText) {
                if (!button) return;
                
                if (isLoading) {
                    button.disabled = true;
                    button.dataset.originalText = button.textContent;
                    button.innerHTML = `<span class="loading-spinner"></span>${loadingText || "Loading..."}`;
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
                            border-color: #0c5460;
                            border-top-color: transparent;
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

            // Clean up on page unload
            window.addEventListener('beforeunload', () => {
                if (unsubscribe) {
                    unsubscribe();
                }
            });
        });
