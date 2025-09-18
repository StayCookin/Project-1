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
    deleteDoc,
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



// Helper functions for showing messages
function showLoading(show) {
    const loadingState = document.getElementById('loadingState');
    const propertyContent = document.getElementById('propertyContent');
    
    if (loadingState) {
        loadingState.style.display = show ? 'block' : 'none';
    }
    if (propertyContent) {
        propertyContent.style.display = show ? 'none' : 'block';
    }
}

function showError(message) {
    console.error(message);
    const errorState = document.getElementById('errorState');
    if (errorState) {
        errorState.textContent = message;
        errorState.style.display = 'block';
        
        // Hide after 5 seconds
        setTimeout(() => {
            errorState.style.display = 'none';
        }, 5000);
    } else {
        // Fallback - create temporary error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f8d7da;
            color: #721c24;
            padding: 10px 15px;
            border-radius: 5px;
            border: 1px solid #f5c6cb;
            z-index: 1000;
            max-width: 300px;
        `;
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }
}

function showSuccess(message) {
    console.log(message);
    // Create a temporary success message
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #d4edda;
        color: #155724;
        padding: 10px 15px;
        border-radius: 5px;
        border: 1px solid #c3e6cb;
        z-index: 1000;
        max-width: 300px;
    `;
    successDiv.textContent = message;
    document.body.appendChild(successDiv);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.parentNode.removeChild(successDiv);
        }
    }, 3000);
}

// Initialize Firebase
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
    
    // Setup inquiry type change handler with null check
    const inquiryType = document.getElementById('inquiryType');
    if (inquiryType) {
        inquiryType.addEventListener('change', function() {
            const schedulingGroup = document.getElementById('schedulingGroup');
            if (schedulingGroup) {
                if (this.value === 'viewing') {
                    schedulingGroup.style.display = 'flex';
                } else {
                    schedulingGroup.style.display = 'none';
                }
            }
        });
    }
    // Setup back button with null check
    const backButton = document.getElementById('backButton');
    if (backButton) {
        backButton.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Check if there's a referrer, otherwise go to default page
            if (document.referrer && document.referrer.includes(window.location.origin)) {
                window.history.back();
            } else {
                window.location.href = 'student-dashboard.html';
            }
        });
    }
});


const dash = document.getElementById("dashboardBtn");
if(dash){
    dash.addEventListener('click', (e) => {
        e.preventDefault();

        if (window.currentUserData && window.currentUserData.role == "STUDENT"){
            window.location.href = "student-dashboard.html"
        }
        else if( window.currentUserData && window.currentUserData.role == "LANDLORD"){
            window.location.href = "landlord-dashboard.html"
        }

    })
}

// Corrected checkIfPropertySaved (keep this single definition)
async function checkIfPropertySaved(propertyId) {
    if (!currentUser || !propertyId) {
        console.log("Cannot check saved status: missing user or property ID");
        isPropertySaved = false;
        updateSaveButton();
        return;
    }

    try {
        const savedQuery = query(
            collection(db, 'savedProperties'),
            where('studentId', '==', currentUser.uid),
            where('propertyId', '==', propertyId)
        );

        const querySnapshot = await getDocs(savedQuery);
        isPropertySaved = !querySnapshot.empty;

        console.log(`Property ${propertyId} saved status:`, isPropertySaved);
        updateSaveButton();
    } catch (error) {
        console.error("Error checking saved status:", error);

        if (error.code === 'permission-denied') {
            showError('Unable to check saved status. Please refresh the page and try again.');
        }
        isPropertySaved = false;
        updateSaveButton();
    }
}

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

                currentUser = { ...user, userData: userData};
                window.currentUserData = userData;
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

async function toggleSaveProperty() {
  if (!currentProperty || !currentUser) {
    showError("Please wait for the page to load fully before saving properties.");
    return;
  }

  const btn = document.getElementById("savePropertyBtn");
  const originalHTML = btn ? btn.innerHTML : "";
  try {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Processing...</span>';
    }

    if (isPropertySaved) {
      // Remove any saved records for this user + property
      const savedQuery = query(
        collection(db, "savedProperties"),
        where("studentId", "==", currentUser.uid),
        where("propertyId", "==", currentProperty.id)
      );

      const querySnapshot = await getDocs(savedQuery);

      if (querySnapshot.empty) {
        console.log("No saved property found to delete.");
        isPropertySaved = false;
        updateSaveButton();
        return;
      }

      for (const docSnap of querySnapshot.docs) {
        await deleteDoc(doc(db, "savedProperties", docSnap.id));
      }

      isPropertySaved = false;
      updateSaveButton();
      showSuccess("Property removed from saved list.");
      return;
    } else {
      // Create saved record
      await addDoc(collection(db, "savedProperties"), {
        studentId: currentUser.uid,
        propertyId: currentProperty.id,
        propertyTitle: currentProperty.title || currentProperty.name || "",
        createdAt: serverTimestamp()
      });

      isPropertySaved = true;
      updateSaveButton();
      showSuccess("Property saved.");
      return;
    }
  } catch (error) {
    console.error("Error toggling saved property:", error);
    showError("Failed to update saved property. Please try again.");
  } finally {
    console.log("Finalizing save toggle");
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHTML;
    }
  }
}
window.toggleSaveProperty = toggleSaveProperty;

function updateSaveButton() {
    const btn = document.getElementById("savePropertyBtn");
    if (!btn) return;
    if (isPropertySaved){
        btn.innerHTML = '<i class="far fa-heart"></i>Saved';
        btn.classList.add("saved");

    }else {
        btn.innerHTML = '<i class="far fa-heart"></i>Save';
        btn.classList.remove("saved");
    }
}

function renderProperty(property) {
    document.title = `${property.title || property.name} - Property Details`;
    
    // Update basic info with null checks
    const titleElement = document.getElementById("propertyTitle");
    if (titleElement) {
        titleElement.textContent = property.title || property.name || "Untitled Property";
    }
    
    const locationElement = document.getElementById("propertyLocation");
    if (locationElement) {
        locationElement.innerHTML = `<i class='fas fa-map-marker-alt'></i> ${property.location || property.address || 'Location not specified'}`;
    }
    
    const priceElement = document.getElementById("propertyPrice");
    if (priceElement) {
        priceElement.textContent = `P${formatPrice(property.rent || property.price)}/month`;
    }

    renderPropertyGallery(property);
    renderPropertyDetails(property);
    
    const contentElement = document.getElementById('propertyContent');
    if (contentElement) {
        contentElement.style.display = 'block';
    }
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
                        <p>Bedroom${(property.bedrooms || property.beds || property.rooms || 1) > 1 ? 's' : ''}</p><h3>${property.bedrooms || property.beds || property.rooms || 1}</h3>
                        
                    </div>
                </div>
                <div class='feature-item'>
                    <i class='fas fa-bath feature-icon'></i>
                    <div>
                        <p>Bathroom${(property.bathrooms || property.baths || property.bathroom || 1) > 1 ? 's' : ''}</p><h3>${property.bathrooms || property.baths || property.bathroom || 1}</h3>
                        
                    </div>
                </div>
                
                <div class='feature-item'>
                    <i class='fas fa-building feature-icon' style="display: flex;"></i>
                    <div> 
                    <p>Property Type</p>
                        <h3>${property.propertyType || property.type || property.houseType }</h3>
                       
                    </div>
                </div>
            </div>
            
            ${property.securityFee || property.deposit ? `
                <div class='additional-costs'>
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
        
      
    `;
}

function getAmenityIcon(amenity) {
    const amenityLower = amenity.toLowerCase();
    const iconMap = {
        'wifi': 'wifi',
        'internet': 'wifi',
        'parking': 'car',
        'kitchen': 'utensils',
        'ac': 'wind',
        'laundry': 'tshirt',
        'washing machine': 'tshirt',
        'pool': 'swimming-pool',
        'balcony': 'building',
        
        'security': 'shield-alt',
        'furnished': 'couch',
        
        
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

// Corrected openMessagingWithLandlord (fix condition and keep flow)
window.openMessagingWithLandlord = async function() {
    console.log("Start messaging function");

    const messagingBtn = document.querySelector('[onclick="openMessagingWithLandlord()"]');
    if(messagingBtn){
        messagingBtn.disabled = true;
        messagingBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>Opening chat';
    }

    if (!currentUser || !currentUser.uid) {
        console.log("No current user");
        showError('Property or user information not available');
        return;
    }

    if (!currentProperty) {
        console.log("No current property");
        showError("Property information not available");
        if(messagingBtn){ 
            messagingBtn.disabled=true;
            messagingBtn.innerHTML = '<i class="fas fa-comments"></i> Message Landlord';
        }
        return;
    }

    const landlordId = currentProperty.landlordId || currentProperty.ownerId;
    if (!landlordId) {
        console.log("No landlord found");
        showError('Landlord information not found for this property');
        if(messagingBtn){
            messagingBtn.disabled=false;
            messagingBtn.innerHTML= '<i class="fas fa-comments"></i>Message Landlord';
        }
        return;
    }

    try {
        const landlordDoc = await getDoc(doc(db, 'users', landlordId));
        let landlordName = 'Landlord';

        if (landlordDoc.exists()) {
            const landlordData = landlordDoc.data();
            if (landlordData.role === 'LANDLORD'){
            landlordName = `${landlordData.firstName || ''} ${landlordData.lastName || ''}`.trim() || 'Landlord';
        } else { console.log('Landlord profile not found');}
    }
        
    
       const messagingContext = {
        landlordId: landlordId,
        landlordName: landlordName,
        propertyId: currentProperty.id,
        propertyName: currentProperty.title || currentProperty.name || 'Property',
        propertyLocation: currentProperty.location || currentProperty.address || '',
        source: 'property-details',
        returnUrl: window.location.href,
        timestamp: Date.now()
        };
       try{
        const expirationTime = Date.now() + (24 * 60 * 60 * 1000);
        sessionStorage.setItem('messagingContext', JSON.stringify({
            data: messagingContext,
            expires: expirationTime
        }));

        sessionStorage.setItem('messageLandlordId',landlordId);
        sessionStorage.setItem('messagePropertyId', currentProperty.id);
        sessionStorage.setItem('messagePropertyName', currentProperty.title || currentProperty.name ||'Property');

        window.location.href = `messages.html?from=property-details&landlord=${landlordId}&property=${currentProperty.id}`;
    } catch (storageError) {
        console.error('Error opening messaging:', storageError);
        window.location.href= `messages.html?from=property-details&landlord=${landlordId}&property=${currentProperty.id}`;
    }
}catch(error){
    console.error("Error opening messaging", error);
    showError( "Failed to open messaging. Please try again. ");

    if (messagingBtn){
        messagingBtn.disabled = false;
        messagingBtn.innerHTML = '<i class="fas fa-comments"></i>Message Landlord';
    }
}
};
window.scheduleViewing = function() {
    if (!currentProperty || !currentUser) {
        showError('Property or user information not available');
        return;
    }

    const landlordId = currentProperty.landlordId || currentProperty.ownerId;
    
    if (!landlordId) {
        showError('Landlord information not found for this property');
        return;
    }

    // Set context for schedule viewing page
    sessionStorage.setItem('viewingPropertyId', currentProperty.id);
    sessionStorage.setItem('viewingLandlordId', landlordId);
    sessionStorage.setItem('viewingPropertyName', currentProperty.title || currentProperty.name || 'Property');
    sessionStorage.setItem('viewingContext', JSON.stringify({
        source: 'property-details',
        returnUrl: window.location.href
    }));

    // Navigate to schedule viewing page
    window.location.href = `schedule-viewing.html?propertyId=${currentProperty.id}&landlordId=${landlordId}`;
};

window.scrollToContact = function() {
    const contactSection = document.getElementById('contactSection');
    if (contactSection) {
        contactSection.scrollIntoView({ 
            behavior: 'smooth' 
        });
    }
};
document.addEventListener('DOMContentLoaded', function() {
    const moveBtn = document.getElementById('moveBtn');
    moveBtn.addEventListener('click', toggleMoveIn);
});
async function toggleMoveIn() {
    const move = document.getElementById("moveBtn");

    const popup = document.createElement('div');
    popup.id = 'moveInPopup';
    popup.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;

    const popupContent = document.createElement('div');
    popupContent.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 8px;
        max-width: 90%;
        max-height: 90%;
        overflow: auto;
        position: relative;
    `;
     popupContent.innerHTML = `
        <button id="closePopupBtn" style="
            position:absolute;
            top:10px;
            right:15px;
            background:none;
            border:none;
            font-size:24px;
            cursor:pointer;">&times;
        </button>

        <div class="agreement-text">
          <h3 style="text-align:center; margin-bottom:10px;">Rental Agreement</h3>

          <p><strong>Parties:</strong> This rental agreement is entered into between 
          <span id="landlordName">[LANDLORD_NAME]</span> (“Landlord”) 
          and <span id="studentName">[STUDENT_NAME]</span> (“Student”).</p>

          <p><strong>Property:</strong> The Landlord agrees to rent the property located at 
          <span id="propertyAddress">[PROPERTY_ADDRESS]</span>.</p>

          <p><strong>Duration:</strong> This agreement is valid from 
          <span id="startDate">[START_DATE]</span> to 
          <span id="endDate">[END_DATE]</span>.</p>

          <p><strong>Rent:</strong> The Student agrees to pay 
          <span id="rentAmount">[RENT_AMOUNT]</span> per month via InRent. 
          A deposit of <span id="depositAmount">[DEPOSIT_AMOUNT]</span> is due upon signing.</p>

          <h4>House Rules</h4>
          <ul id="houseRules">
            <li>No pets allowed unless agreed in writing.</li>
            <li>Curfew at 10PM unless otherwise stated.</li>
            <li>Respect quiet hours after 9PM.</li>
            <li>Visitors must be approved by the Landlord.</li>
          </ul>

          <p>
            By signing this agreement, the Student acknowledges that they have read,
            understood, and agree to the terms, including the house rules stated above.
          </p>

          <button id="moveInConfirmBtn" style="
              margin-top:20px;
              padding:10px 15px;
              background:#007bff;
              color:white;
              border:none;
              border-radius:4px;
              cursor:pointer;">Move In</button>
        </div>
    `;

    popup.appendChild(popupContent);
    document.body.appendChild(popup);

    const closePopup = () => {
        document.body.removeChilde(popup);
    };
   
    const closeBtn = document.getElementById('closePopupBtn');
    const moveInBtn = document.getElementById('moveInConfirmBtn');

    document.getElementById('closePopupBtn').onclick = () => {
        document.body.removeChild(popup);
    };

    document.getElementById("moveInConfirmBtn").onclick = () => {

        alert("Proceeding to payment");
        closePopup();
    }

 closeBtn = document.getElementById('button');
   closeBtn.innerHTML = '&times;';
   closeBtn.style.cssText = `
        position: absolute;
        top: 10px;
        right: 15px;
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
    `;
   
    const documentFrame = document.createElement('iframe');
    documentFrame.src = '';
    documentFrame.style.cssText = `
        width: 800px;
        height: 600px;
        border: none;
    `;
    
    popupContent.appendChild(closeBtn);
    popupContent.appendChild(documentFrame);
    popup.appendChild(popupContent);

    document.body.appendChild(popup);


    closeBtn.onclick = closePopup;
    popup.onclick = (e) => {
        if (e.target === popup) closePopup();    };
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                closePopup();
                document.removeEventListener('keydown', escHandler);
            }
        });
}

window.sendInquiry = async function() {
    const inquiryType = document.getElementById('inquiryType');
    const message = document.getElementById('message');
    const preferredDate = document.getElementById('preferredDate');
    
    if (!inquiryType || !message) {
        showError('Required form elements not found');
        return;
    }
    
    const inquiryTypeValue = inquiryType.value;
    const messageValue = message.value.trim();
    const preferredDateValue = preferredDate ? preferredDate.value : '';
    
    if (!messageValue) {
        showError('Please enter a message');
        return;
    }
    
    if (inquiryTypeValue === 'viewing' && !preferredDateValue) {
        showError('Please select a preferred date and time for the viewing');
        return;
    }
    
    try {
        const inquiryData = {
            studentId: currentUser.uid,
            propertyId: currentProperty.id,
            landlordId: currentProperty.landlordId || currentProperty.ownerId,
            type: inquiryTypeValue,
            message: messageValue,
            createdAt: serverTimestamp(),
            status: 'pending'
        };
        
        if (inquiryTypeValue === 'viewing') {
            inquiryData.preferredDate = new Date(preferredDateValue);
            
            // Also create a viewing request
            await addDoc(collection(db, 'viewings'), {
                studentId: currentUser.uid,
                propertyId: currentProperty.id,
                landlordId: currentProperty.landlordId || currentProperty.ownerId,
                scheduledDate: new Date(preferredDateValue),
                status: 'pending',
                notes: messageValue,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        }
        
        // Create inquiry record
        await addDoc(collection(db, 'inquiries'), inquiryData);
        
        showSuccess('Your inquiry has been sent successfully!');
        
        // Clear form
        message.value = '';
        if (preferredDate) preferredDate.value = '';
        
    } catch (error) {
        console.error('Error sending inquiry:', error);
        showError('Failed to send inquiry. Please try again.');
    }
};