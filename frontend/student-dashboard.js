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
  apiKey: "AIzaSyAXKk5gRjwSGK_g9f_HP_f4y4445e_8l4w",
  authDomain: "project-1-1e31c.firebaseapp.com",
  projectId: "project-1-1e31c",
  storageBucket: "project-1-1e31c.firebasestorage.app",
  messagingSenderId: "658275930203",
  appId: "1:658275930203:web:afc2e2a249509737b0ef7e",
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

  // ... rest of the class remains the same ...

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
      const viewingRequestsRef = collection(db, 'viewingRequests');
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
      await addDoc(collection(db, 'viewingRequests'), {
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

  // ... rest of the class remains the same ...
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