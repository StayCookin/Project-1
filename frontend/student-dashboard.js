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
  addDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  orderBy,
  limit,
  onSnapshot,
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

let app;
let db;
let auth;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
} catch (error) {
  console.error('Firebase initialization failed:', error);
  showCriticalError('Failed to initialize Firebase services');
}

class StudentDashboard {
  constructor() {
    this.currentUser = null;
    this.userProfile = null;
    this.currentRating = 0;
    this.authUnsubscribe = null;
    this.init();
  }

  async init() {
    try {
      if (!db || !auth) {
        throw new Error('Firebase services not initialized');
      }
      
      await this.waitForFirebaseAuth();
      this.setupEventListeners();
    } catch (error) {
      console.error('Dashboard initialization failed:', error);
      this.handleError('Failed to initialize dashboard');
    }
  }

  // MISSING METHOD: Wait for Firebase Auth to initialize
  waitForFirebaseAuth() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Firebase Auth timeout'));
      }, 10000); // 10 second timeout

      this.authUnsubscribe = onAuthStateChanged(auth, async (user) => {
        clearTimeout(timeout);
        try {
          this.currentUser = user;
          if (user) {
            console.log('User authenticated:', user.email);
            await this.loadUserProfile(user);
            await this.fetchDashboardStats(user);
            this.updateUIForAuthenticatedUser();
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            if(userDoc.exists()){
              const userData = userDoc.data();
              const firstName = userData.firstName;

              document.getElementById("sidebarWelcome").textContent= `Dumela, ${firstName}`;
            }
          } else {
            console.log('No user authenticated');
            this.updateUIForUnauthenticatedUser();
          }
          resolve(user);
        } catch (error) {
          reject(error);
        }
      }, (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  // MISSING METHOD: Handle errors
  handleError(message, error = null) {
    console.error('Dashboard Error:', message, error);
    this.showNotification(message, 'error');
  }

  // MISSING METHOD: Setup event listeners
  setupEventListeners() {
    // Sign out button
    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn) {
      signOutBtn.addEventListener('click', this.handleSignOut.bind(this));
    }

    
const openSidebarBtn = document.getElementById('openSidebarBtn');
const closeSidebarBtn = document.getElementById('closeSidebarBtn');
const sidebar = document.getElementById('sidebar');
const mobileOverlay = document.getElementById('mobileOverlay');

if(openSidebarBtn && closeSidebarBtn && sidebar && mobileOverlay) {
  openSidebarBtn.addEventListener('click', () => {sidebar.classList.add('open');
    sidebar.classList.add('open');
    mobileOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  });

  closeSidebarBtn.addEventListener('click', () => {
    sidebar.classList.remove('open');
    mobileOverlay.classList.remove('open');
    document.body.style.overflow = '';
  });

  const sidebarLinks = sidebar.querySelectorAll('a');
  sidebarLinks.forEach(link => {
    link.addEventListener('click', () => {
      if(window.innerWidth < 768) {
        sidebar.classList.remove('open');
        mobileOverlay.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  });
}

const notificationToggle = document.getElementById('notificationToggle');
const notificationDropdown = document.getElementById('notificationDropdown');

if(notificationToggle && notificationDropdown) {
  notificationToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  notificationDropdown.classList.toggle('hidden');
  });
}

const profileMenuToggle = document.getElementById('profileMenuToggle');
const profileDropdown = document.getElementById('profileDropdown');
if(profileMenuToggle && profileDropdown) {
  profileMenuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    profileDropdown.classList.toggle('hidden');
  });
}

document.addEventListener('click', () => {
  if ( notificationDropdown) notificationDropdown.classList.add('hidden');
  if (profileDropdown) profileDropdown.classList.add('hidden');
});

const logoutBtn = document.getElementById('logoutBtn');
const headerLogoutBtn = document.getElementById('headerLogoutBtn');

if(logoutBtn) {
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    this.handleSignOut();
  });
}
if (headerLogoutBtn) {
  headerLogoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    this.handleSignOut();
  });
}
    const reviewForm = document.getElementById('reviewForm');
  if (reviewForm) {
    reviewForm.addEventListener('submit', this.handleReviewSubmission.bind(this));
  }

  // Star rating
  this.setupStarRating();

  // Modal close buttons
  const closeModalBtns = document.querySelectorAll('[data-close-modal]');
  closeModalBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close-modal');
      this.closeModal(modalId);
    });
  });

  // Favorite buttons for property cards
  const favoriteButtons = document.querySelectorAll('.favorite-btn');
  favoriteButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const propertyCard = btn.closest('.property-card');
      const propertyId = propertyCard?.getAttribute('data-id');
      if (propertyId) {
        this.toggleSaveProperty(propertyId);
      }
    });
  });
  }

  // MISSING METHOD: Load user profile
  async loadUserProfile(user) {
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        this.userProfile = userDoc.data();
        console.log('User profile loaded:', this.userProfile);
      } else {
        console.log('No user profile found');
        this.userProfile = null;
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      this.userProfile = null;
    }
  }



 async fetchDashboardStats(user) {
  if (!user) return;

  // Real-time listener for saved properties
  const savedQuery = query(
    collection(db, 'savedProperties'),
    where('userId', '==', user.uid)
  );
  
  onSnapshot(savedQuery, (snapshot) => {
    const count = snapshot.size;
    const cardFavorites = document.getElementById('cardFavorites');
    if (cardFavorites) {
      cardFavorites.textContent = count;
      // Add animation effect
      cardFavorites.classList.add('scale-110');
      setTimeout(() => cardFavorites.classList.remove('scale-110'), 300);
    }
  }, (error) => {
    console.error('Error listening to saved properties:', error);
  });

  // Real-time listener for viewing bookings
  const viewingsQuery = query(
    collection(db, 'viewingBookings'),
    where('studentId', '==', user.uid),
    where('status', 'in', ['pending', 'scheduled'])
  );
  
  onSnapshot(viewingsQuery, (snapshot) => {
    const count = snapshot.size;
    const cardViewings = document.getElementById('cardViewings');
    if (cardViewings) {
      cardViewings.textContent = count;
      cardViewings.classList.add('scale-110');
      setTimeout(() => cardViewings.classList.remove('scale-110'), 300);
    }
  }, (error) => {
    console.error('Error listening to viewings:', error);
  });

  // Real-time listener for messages/conversations
  const conversationsQuery = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', user.uid)
  );
  
  onSnapshot(conversationsQuery, (snapshot) => {
    let unreadCount = 0;
    snapshot.forEach(doc => {
      const data = doc.data();
      // Count unread messages for this user
      if (data.unreadCount && data.unreadCount[user.uid]) {
        unreadCount += data.unreadCount[user.uid];
      }
    });
    
    const cardMessages = document.getElementById('cardMessages');
    const notificationBadge = document.getElementById('notificationBadge');
    
    if (cardMessages) {
      cardMessages.textContent = unreadCount;
      cardMessages.classList.add('scale-110');
      setTimeout(() => cardMessages.classList.remove('scale-110'), 300);
    }
    
    if (notificationBadge) {
      notificationBadge.textContent = unreadCount;
      notificationBadge.classList.toggle('hidden', unreadCount === 0);
    }
  }, (error) => {
    console.error('Error listening to messages:', error);
  });

  // Real-time listener for application status
  const applicationQuery = query(
    collection(db, 'applications'),
    where('studentId', '==', user.uid),
    orderBy('submittedAt', 'desc'),
    limit(1)
  );
  
  onSnapshot(applicationQuery, (snapshot) => {
    const cardApplication = document.getElementById('cardApplication');
    if (cardApplication) {
      if (!snapshot.empty) {
        const appData = snapshot.docs[0].data();
        const status = appData.status || 'Pending';
        const propertyName = appData.propertyName || 'Property';
        
        // Update status with color coding
        const statusColors = {
          'pending': 'text-yellow-600',
          'approved': 'text-green-600',
          'rejected': 'text-red-600',
          'under_review': 'text-blue-600'
        };
        
        const colorClass = statusColors[status.toLowerCase()] || 'text-blue-600';
        cardApplication.innerHTML = `Application <span class="${colorClass} font-bold">${status}</span>`;
        
        // Update property name if element exists
        const propertyNameEl = cardApplication.nextElementSibling;
        if (propertyNameEl) {
          propertyNameEl.textContent = `for ${propertyName}`;
        }
      } else {
        cardApplication.innerHTML = 'No Active <span class="text-gray-600">Application</span>';
      }
      
      cardApplication.classList.add('scale-110');
      setTimeout(() => cardApplication.classList.remove('scale-110'), 300);
    }
  }, (error) => {
    console.error('Error listening to applications:', error);
  });
}
  

  // MISSING METHOD: Update UI for authenticated user
  updateUIForAuthenticatedUser() {
    const welcomeMsg = document.getElementById('welcomeMessage');
    if (welcomeMsg) {
      const userName = this.userProfile?.firstName || this.currentUser?.displayName || 'Student';
      welcomeMsg.textContent = `Welcome back, ${userName}!`;
    }

    // Show authenticated user elements
    const authElements = document.querySelectorAll('[data-auth="true"]');
    authElements.forEach(el => el.classList.remove('hidden'));

    // Hide unauthenticated elements
    const noAuthElements = document.querySelectorAll('[data-auth="false"]');
    noAuthElements.forEach(el => el.classList.add('hidden'));
  }

  // MISSING METHOD: Update UI for unauthenticated user
  updateUIForUnauthenticatedUser() {
    // Hide authenticated user elements
    const authElements = document.querySelectorAll('[data-auth="true"]');
    authElements.forEach(el => el.classList.add('hidden'));

    // Show unauthenticated elements
    const noAuthElements = document.querySelectorAll('[data-auth="false"]');
    noAuthElements.forEach(el => el.classList.remove('hidden'));

    // Redirect to login if on protected page
    if (window.location.pathname.includes('dashboard')) {
      window.location.href = 'login.html';
    }
  }

  // MISSING METHOD: Update dashboard stats in UI
  updateDashboardStats(stats) {
    const savedCountEl = document.getElementById('savedPropertiesCount');
    if (savedCountEl) savedCountEl.textContent = stats.savedProperties;

    const viewingCountEl = document.getElementById('viewingRequestsCount');
    if (viewingCountEl) viewingCountEl.textContent = stats.viewingRequests;

    const reviewsCountEl = document.getElementById('reviewsCount');
    if (reviewsCountEl) reviewsCountEl.textContent = stats.reviews;
  }

  // MISSING METHOD: Handle sign out
async handleSignOut() {
    try {
      await signOut(auth);
      this.showNotification('Signed out successfully', 'success');
      window.location.href = 'index.html';
    } catch (error) {
      console.error('Sign out error:', error);
      this.showNotification('Error signing out', 'error');
    }
  }

  // MISSING METHOD: Setup star rating
  setupStarRating() {
    const stars = document.querySelectorAll('.star-rating .star');
    stars.forEach((star, index) => {
      star.addEventListener('click', () => {
        this.currentRating = index + 1;
        this.updateStarDisplay();
      });

      star.addEventListener('mouseover', () => {
        this.highlightStars(index + 1);
      });
    });

    const starContainer = document.querySelector('.star-rating');
    if (starContainer) {
      starContainer.addEventListener('mouseleave', () => {
        this.updateStarDisplay();
      });
    }
  }

  // MISSING METHOD: Update star display
  updateStarDisplay() {
    const stars = document.querySelectorAll('.star-rating .star');
    stars.forEach((star, index) => {
      if (index < this.currentRating) {
        star.classList.add('active');
      } else {
        star.classList.remove('active');
      }
    });
  }

  // MISSING METHOD: Highlight stars on hover
  highlightStars(rating) {
    const stars = document.querySelectorAll('.star-rating .star');
    stars.forEach((star, index) => {
      if (index < rating) {
        star.classList.add('hover');
      } else {
        star.classList.remove('hover');
      }
    });
  }

  // MISSING METHOD: Show notification
  showNotification(message, type = 'info') {
    // Create notification element if it doesn't exist
    let notificationContainer = document.getElementById('notificationContainer');
    if (!notificationContainer) {
      notificationContainer = document.createElement('div');
      notificationContainer.id = 'notificationContainer';
      notificationContainer.className = 'fixed top-4 right-4 z-50 space-y-2';
      document.body.appendChild(notificationContainer);
    }

    const notification = document.createElement('div');
    const bgColor = type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-blue-500';
    
    notification.className = `${bgColor} text-white px-4 py-2 rounded-lg shadow-lg transform translate-x-full transition-transform duration-300`;
    notification.textContent = message;

    notificationContainer.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.classList.remove('translate-x-full');
    }, 100);

    // Remove after 5 seconds
    setTimeout(() => {
      notification.classList.add('translate-x-full');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 5000);
  }

  // MISSING METHOD: Update save button
  updateSaveButton(propertyId, isSaved) {
    const saveBtn = document.querySelector(`[data-property-id="${propertyId}"] .save-btn`);
    if (saveBtn) {
      const icon = saveBtn.querySelector('i');
      if (isSaved) {
        icon.className = 'fas fa-heart text-red-500';
        saveBtn.setAttribute('title', 'Remove from saved');
      } else {
        icon.className = 'far fa-heart text-gray-400';
        saveBtn.setAttribute('title', 'Save property');
      }
    }
  }

  // MISSING METHOD: Close modal
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  // MISSING METHOD: Close review modal specifically
  closeReviewModal() {
    const modal = document.getElementById('reviewModal');
    if (modal) {
      modal.classList.add('hidden');
      // Reset form
      document.getElementById('reviewForm').reset();
      this.currentRating = 0;
      this.updateStarDisplay();
      document.getElementById('reviewFormSuccess').classList.add('hidden');
    }
  }

  // MISSING METHOD: Cleanup method
  cleanup() {
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
    }
  }

  // EXISTING METHODS (from your original code)
  async toggleSaveProperty(propertyId) {
    if (!this.currentUser) {
      this.showNotification('Please log in to save properties', 'error');
      return;
    }

    try {
      const savedPropertyRef = doc(db, 'savedProperties', `${this.currentUser.uid}_${propertyId}`);
      const savedPropertyDoc = await getDoc(savedPropertyRef);

      if (savedPropertyDoc.exists()) {
        // Unsave property
        await deleteDoc(savedPropertyRef);
        this.updateSaveButton(propertyId, false);
        this.showNotification('Property removed from saved list', 'success');
      } else {
        // Save property
        await setDoc(savedPropertyRef, {
          userId: this.currentUser.uid,
          propertyId: propertyId,
          savedAt: serverTimestamp()
        });
        this.updateSaveButton(propertyId, true);
        this.showNotification('Property saved successfully', 'success');
      }

      // Refresh dashboard stats
      await this.fetchDashboardStats(this.currentUser);

    } catch (error) {
      console.error('Error toggling save property:', error);
      this.showNotification('Failed to update saved properties', 'error');
    }
  }

  async scheduleViewing(propertyId) {
    if (!this.currentUser) {
      this.showNotification('Please log in to schedule viewings', 'error');
      return;
    }

    // Check if user already has a viewing for this property
    try {
      const viewingRequestsRef = collection(db, 'viewingBookings');
      const q = query(
        viewingRequestsRef,
        where('studentId', '==', this.currentUser.uid),
        where('propertyId', '==', propertyId),
        where('status', 'in', ['pending', 'scheduled'])
      );
      
      const existingViewing = await getDocs(q);

      if (!existingViewing.empty) {
        this.showNotification('You already have a viewing request for this property', 'info');
        return;
      }

      // Create viewing request
      await addDoc(collection(db, 'viewingBookings'), {
        studentId: this.currentUser.uid,
        propertyId: propertyId,
        status: 'pending',
        requestedAt: serverTimestamp(),
        studentName: this.userProfile?.firstName || this.currentUser.displayName || 'Student',
        studentEmail: this.currentUser.email
      });

      this.showNotification('Viewing request submitted successfully! The landlord will contact you soon.', 'success');
      
      // Refresh dashboard stats
      await this.fetchDashboardStats(this.currentUser);

    } catch (error) {
      console.error('Error scheduling viewing:', error);
      this.showNotification('Failed to schedule viewing. Please try again.', 'error');
    }
  }

  async handleReviewSubmission(event) {
    event.preventDefault();
    
    if (!this.currentUser) {
      this.showNotification('You must be logged in to submit a review', 'error');
      return;
    }

    if (this.currentRating === 0) {
      this.showNotification('Please select a rating', 'error');
      return;
    }

    const reviewText = document.getElementById('reviewText').value.trim();
    if (!reviewText) {
      this.showNotification('Please write a review', 'error');
      return;
    }

    try {
      // Add review to Firestore
      await addDoc(collection(db, 'reviews'), {
        userId: this.currentUser.uid,
        userEmail: this.currentUser.email,
        userName: this.userProfile?.firstName || this.currentUser.displayName || 'Anonymous',
        rating: this.currentRating,
        reviewText: reviewText,
        timestamp: serverTimestamp(),
        status: 'pending' // For moderation if needed
      });

      document.getElementById('reviewFormSuccess').classList.remove('hidden');
      this.showNotification('Review submitted successfully', 'success');
      
      // Refresh dashboard stats
      await this.fetchDashboardStats(this.currentUser);
      
      // Close modal after delay
      setTimeout(() => this.closeReviewModal(), 2000);

    } catch (error) {
      console.error('Error submitting review:', error);
      this.showNotification('Failed to submit review. Please try again.', 'error');
    }
  }
  
}

// Error handling wrapper
function initializeDashboard() {
  try {
    // Check if Firebase services were initialized
    if (!db || !auth) {
      throw new Error('Firebase services not initialized');
    }

    // Initialize dashboard
    window.studentDashboard = new StudentDashboard();
    
    // Setup cleanup on page unload
    window.addEventListener('beforeunload', () => {
      if (window.studentDashboard) {
        window.studentDashboard.cleanup();
      }
    });

  } catch (error) {
    console.error('Critical error initializing dashboard:', error);
    showCriticalError('Failed to initialize dashboard: ' + error.message);
  }
}

function showCriticalError(message) {
  document.body.innerHTML = `
    <div class="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div class="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
        <i class="fas fa-exclamation-triangle text-red-500 text-6xl mb-4"></i>
        <h1 class="text-2xl font-bold text-gray-800 mb-4">Critical Error</h1>
        <p class="text-gray-600 mb-4">${message}</p>
        <div class="space-y-2">
          <button onclick="location.reload()" class="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors">
            Reload Page
          </button>
          <button onclick="window.location.href='index.html'" class="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors">
            Return to Home
          </button>
        </div>
      </div>
    </div>
  `;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDashboard);
} else {
  initializeDashboard();
}

