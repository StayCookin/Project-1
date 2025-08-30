  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
        import {
            getAuth,
            onAuthStateChanged,
        } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
        import {
            getFirestore,
            doc,
            getDoc,
            collection,
            query,
            where,
            getDocs,
            addDoc,
            serverTimestamp
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

        let app, db, auth;
        let currentUser = null;
        let currentProperty = null;
        let isPropertySaved = false;

        try {
            app = initializeApp(firebaseConfig);
            db = getFirestore(app);
            auth = getAuth(app);
        } catch (error) {
            console.error('Firebase initialization failed:', error);
            showError('Failed to initialize Firebase services');
        }

        document.addEventListener("DOMContentLoaded", function () {
            initializeAuth();
            
            // Setup inquiry type change handler
            const inquiryType = document.getElementById('inquiryType');
            inquiryType.addEventListener('change', function() {
                const schedulingGroup = document.getElementById('schedulingGroup');
                if (this.value === 'viewing') {
                    schedulingGroup.style.display = 'flex';
                } else {
                    schedulingGroup.style.display = 'none';
                }
            });
        });

        async function initializeAuth() {
            try {
                onAuthStateChanged(auth, async (user) => {
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
                        if (!userData || userData.role !== "STUDENT") {
                            showError("Only students can view property details");
                            setTimeout(() => {
                                window.location.href = "index.html";
                            }, 2000);
                            return;
                        }

                        currentUser = user;
                        await fetchPropertyDetails();
                        
                    } catch (error) {
                        console.error("Error checking user authentication:", error);
                        showError("Failed to verify user permissions. Please try logging in again.");
                        setTimeout(() => {
                            window.location.href = "login.html";
                        }, 2000);
                    }
                });
            } catch (error) {
                console.error('Auth initialization error:', error);
                showError('Authentication failed');
            }
        }

        async function fetchPropertyDetails() {
            const urlParams = new URLSearchParams(window.location.search);
            const propertyId = urlParams.get("id");
            
            console.log("Property ID from URL:", propertyId);
            
            if (!propertyId) {
                showError("Property ID not found in URL");
                return;
            }

            try {
                showLoading(true);
                
                const propertyDocRef = doc(db, "properties", propertyId);
                const propertyDoc = await getDoc(propertyDocRef);
                
                if (!propertyDoc.exists()) {
                    throw new Error("Property not found");
                }
                
                const property = {
                    id: propertyDoc.id,
                    ...propertyDoc.data()
                };
                
                console.log("Fetched property data:", property);
                
                currentProperty = property;
                renderProperty(property);
                await checkIfPropertySaved(propertyId);
                
                showLoading(false);
                
            } catch (error) {
                console.error("Error fetching property details:", error);
                showLoading(false);
                showError(`Failed to load property: ${error.message}`);
            }
        }

        function renderProperty(property) {
            document.title = `${property.title || property.name} - Property Details`;
            
            // Update basic info
            document.getElementById("propertyTitle").textContent = 
                property.title || property.name || "Untitled Property";
            document.getElementById("propertyLocation").innerHTML = 
                `<i class='fas fa-map-marker-alt'></i> ${property.location || property.address || 'Location not specified'}`;
            document.getElementById("propertyPrice").textContent = 
                `P${formatPrice(property.rent || property.price)}/month`;

            renderPropertyGallery(property);
            renderPropertyDetails(property);
            
            document.getElementById('propertyContent').style.display = 'block';
        }

        function renderPropertyGallery(property) {
            const gallery = document.getElementById("propertyGallery");
            if (!gallery) return;
            
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
                gallery.innerHTML = `
                    <div class="no-image-placeholder">
                        <i class="fas fa-image" style="margin-right: 10px;"></i>
                        No images available for this property
                    </div>
                `;
                return;
            }
            
            // Display main image
            const mainImage = uniqueImages[0];
            gallery.innerHTML = `
                <img src="${mainImage}" 
                     alt="${property.title || property.name}" 
                     class="main-image" 
                     onerror="this.src='https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'" />
                ${uniqueImages.length > 1 ? `
                    <div class="image-counter">
                        1 / ${uniqueImages.length}
                    </div>
                ` : ''}
            `;
            
            // Add thumbnails if there are multiple images
            if (uniqueImages.length > 1) {
                const thumbnailGrid = document.createElement('div');
                thumbnailGrid.className = 'thumbnail-grid';
                
                uniqueImages.forEach((img, index) => {
                    const thumbnail = document.createElement('img');
                    thumbnail.src = img;
                    thumbnail.className = `thumbnail ${index === 0 ? 'active' : ''}`;
                    thumbnail.alt = `${property.title || property.name} - Image ${index + 1}`;
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
                        
                        // Update thumbnail active state
                        thumbnailGrid.querySelectorAll('.thumbnail').forEach((thumb, i) => {
                            thumb.classList.toggle('active', i === index);
                        });
                    });
                    
                    thumbnailGrid.appendChild(thumbnail);
                });
                
                gallery.appendChild(thumbnailGrid);
            }
        }

        function renderPropertyDetails(property) {
            const details = document.getElementById("propertyDetails");
            if (!details) return;
            
            const amenities = formatAmenities(property.amenities || property.features || []);
            
            details.innerHTML = `
                <div class='content-card'>
                    <div class='features-grid'>
                        <div class='feature-item'>
                            <i class='fas fa-bed feature-icon'></i>
                            <div>
                                <h3>${property.bedrooms || property.beds || property.rooms || 1}</h3>
                                <p>Bedroom${(property.bedrooms || property.beds || property.rooms || 1) > 1 ? 's' : ''}</p>
                            </div>
                        </div>
                        <div class='feature-item'>
                            <i class='fas fa-bath feature-icon'></i>
                            <div>
                                <h3>${property.bathrooms || property.baths || property.bathroom || 1}</h3>
                                <p>Bathroom${(property.bathrooms || property.baths || property.bathroom || 1) > 1 ? 's' : ''}</p>
                            </div>
                        </div>
                        <div class='feature-item'>
                            <i class='fas fa-ruler-combined feature-icon'></i>
                            <div>
                                <h3>${property.size || property.area || 'N/A'}</h3>
                                <p>Square Feet</p>
                            </div>
                        </div>
                        <div class='feature-item'>
                            <i class='fas fa-building feature-icon'></i>
                            <div>
                                <h3>${property.propertyType || property.type || property.houseType || 'Apartment'}</h3>
                                <p>Property Type</p>
                            </div>
                        </div>
                    </div>
                    
                    ${property.securityFee || property.deposit ? `
                        <div class='additional-costs'>
                            <h3>Additional Costs</h3>
                            ${property.securityFee ? `<p><strong>Security Fee:</strong> P${formatPrice(property.securityFee)}</p>` : ''}
                            ${property.deposit ? `<p><strong>Deposit:</strong> P${formatPrice(property.deposit)}</p>` : ''}
                        </div>
                    ` : ''}
                </div>
                
                <div class='content-card'>
                    <h2 class='section-title'>Description</h2>
                    <p style='line-height: 1.6;'>${property.description || property.details || 'No description provided by the landlord.'}</p>
                </div>
                
                <div class='content-card'>
                    <h2 class='section-title'>Amenities & Features</h2>
                    <div class='amenities-list'>
                        ${amenities.length > 0 ? 
                            amenities.map(amenity => 
                                `<div class='amenity-item'>
                                    <i class='fas fa-${getAmenityIcon(amenity.name || amenity)} amenity-icon'></i>
                                    <span>${amenity.name || amenity}</span>
                                </div>`
                            ).join('') : 
                            '<p style="color: #666;">No amenities listed by the landlord.</p>'
                        }
                    </div>
                </div>
                
                ${property.rules || property.houseRules ? `
                    <div class='content-card'>
                        <h2 class='section-title'>House Rules</h2>
                        <p style='line-height: 1.6;'>${property.rules || property.houseRules}</p>
                    </div>
                ` : ''}
                
                <div class='property-actions'>
                    <button id='savePropertyBtn' class='btn btn-secondary' onclick='toggleSaveProperty()'>
                        <i class='far fa-heart'></i> <span id='saveButtonText'>Save Property</span>
                    </button>
                    <button class='btn btn-primary' onclick='scrollToContact()'>
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

        function formatPrice(price) {
            if (!price) return '0';
            return parseFloat(price).toLocaleString();
        }

        function formatAmenities(amenities) {
            if (!Array.isArray(amenities)) {
                if (typeof amenities === 'string') {
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

        async function checkIfPropertySaved(propertyId) {
            try {
                const savedQuery = query(
                    collection(db, 'savedProperties'),
                    where('studentId', '==', currentUser.uid),
                    where('propertyId', '==', propertyId)
                );
                
                const querySnapshot = await getDocs(savedQuery);
                isPropertySaved = !querySnapshot.empty;
                
                updateSaveButton();
            } catch (error) {
                console.error('Error checking saved status:', error);
            }
        }

        function updateSaveButton() {
            const btn = document.getElementById('savePropertyBtn');
            const text = document.getElementById('saveButtonText');
            const icon = btn.querySelector('i');
            
            if (isPropertySaved) {
                icon.className = 'fas fa-heart';
                text.textContent = 'Saved';
                btn.classList.add('btn-primary');
                btn.classList.remove('btn-secondary');
            } else {
                icon.className = 'far fa-heart';
                text.textContent = 'Save Property';
                btn.classList.add('btn-secondary');
                btn.classList.remove('btn-primary');
            }
        }

        window.toggleSaveProperty = async function() {
            if (!currentProperty || !currentUser) return;
            
            try {
                if (isPropertySaved) {
                    // Remove from saved properties
                    const savedQuery = query(
                        collection(db, 'savedProperties'),
                        where('studentId', '==', currentUser.uid),
                        where('propertyId', '==', currentProperty.id)
                    );
                    
                    const querySnapshot = await getDocs(savedQuery);
                    querySnapshot.forEach(async (docSnapshot) => {
                        await deleteDoc(doc(db, 'savedProperties', docSnapshot.id));
                    });
                    
                    isPropertySaved = false;
                    showSuccess('Property removed from saved list');
                } else {
                    // Add to saved properties
                    await addDoc(collection(db, 'savedProperties'), {
                        studentId: currentUser.uid,
                        propertyId: currentProperty.id,
                        savedAt: serverTimestamp()
                    });
                    
                    isPropertySaved = true;
                    showSuccess('Property saved successfully');
                }
                
                updateSaveButton();
            } catch (error) {
                console.error('Error toggling save status:', error);
                showError('Failed to update saved status. Please try again.');
            }
        };

        window.scrollToContact = function() {
            document.getElementById('contactSection').scrollIntoView({ 
                behavior: 'smooth' 
            });
        };

        window.sendInquiry = async function() {
            const inquiryType = document.getElementById('inquiryType').value;
            const message = document.getElementById('message').value.trim();
            const preferredDate = document.getElementById('preferredDate').value;
            
            if (!message) {
                showError('Please enter a message');
                return;
            }
            
            if (inquiryType === 'viewing' && !preferredDate) {
                showError('Please select a preferred date and time for the viewing');
                return;
            }
            
            try {
                const inquiryData = {
                    studentId: currentUser.uid,
                    propertyId: currentProperty.id,
                    landlordId: currentProperty.landlordId || currentProperty.ownerId,
                    type: inquiryType,
                    message: message,
                    createdAt: serverTimestamp(),
                    status: 'pending'
                };
                
                if (inquiryType === 'viewing') {
                    inquiryData.preferredDate = new Date(preferredDate);
                    
                    // Also create a viewing request
                    await addDoc(collection(db, 'viewings'), {
                        studentId: currentUser.uid,
                        propertyId: currentProperty.id,
                        landlordId: currentProperty.landlordId || currentProperty.ownerId,
                        scheduledDate: new Date(preferredDate),
                        status: 'pending',
                        notes: message,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    });
                }
                
                // Create inquiry record
                await addDoc(collection(db, 'inquiries'), inquiryData);
                
                showSuccess('Your inquiry has been sent successfully!');
                
                // Clear form
                document.getElementById('message').value = '';
                document.getElementById('preferredDate').value = '';
                
            } catch (error) {
                console.error('Error sending inquiry:', error);
                showError('Failed to send inquiry. Please try again.');
            }
        };

        function showLoading(show) {
            const loadingState = document.getElementById('loadingState');
            const propertyContent = document.getElementById('propertyContent');
            
            if (show) {
                loadingState.style.display = 'block';
                propertyContent.style.display = 'none';
            } else {
                loadingState.style.display = 'none';
                propertyContent.style.display = 'block';
            }
        }

        function showError(message) {
            const errorState = document.getElementById('errorState');
            errorState.textContent = message;
            errorState.style.display = 'block';
            
            // Hide after 5 seconds
            setTimeout(() => {
                errorState.style.display = 'none';
            }, 5000);
        }

        function showSuccess(message) {
            // Create a temporary success message
            const successDiv = document.createElement('div');
            successDiv.className = 'error-message';
            successDiv.style.background = '#d4edda';
            successDiv.style.color = '#155724';
            successDiv.textContent = message;
            
            const container = document.querySelector('.container');
            container.insertBefore(successDiv, container.firstChild);
            
            // Remove after 3 seconds
            setTimeout(() => {
                successDiv.remove();
            }, 3000);
        }

        // Set up back button
        document.getElementById('backButton').addEventListener('click', (e) => {
            e.preventDefault();
            
            // Check if there's a referrer, otherwise go to default page
            if (document.referrer && document.referrer.includes(window.location.origin)) {
                window.history.back();
            } else {
                window.location.href = 'student-dashboard.html';
            }
        });