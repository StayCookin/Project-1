import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    doc, 
    addDoc, 
    updateDoc, 
    onSnapshot, 
    query, 
    where, 
    orderBy, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
import { 
    getAuth, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";

// Firebase configuration
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

// Global variables
let currentUser = null;
let viewingsListener = null;

// Viewing status constants
const VIEWING_STATUS = {
    CONFIRMED: 'confirmed',
    PENDING: 'pending',
    CANCELLED: 'cancelled',
    COMPLETED: 'completed'
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeAuth();
});

// Authentication initialization
function initializeAuth() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            loadUserViewings();
        } else {
            currentUser = null;
            showLoginPrompt();
        }
    });
}

// Load user's viewings from Firebase
async function loadUserViewings() {
    if (!currentUser) return;

    try {
        const viewingsQuery = query(
            collection(db, 'viewingBookings'),
            where('userId', '==', currentUser.uid),
            orderBy('date', 'asc')
        );

        // Clear existing listener
        if (viewingsListener) {
            viewingsListener();
            viewingsListener = null;
        }

        // Set up real-time listener
        viewingsListener = onSnapshot(viewingsQuery, (snapshot) => {
            const viewings = [];
            snapshot.forEach((doc) => {
                viewings.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            renderViewings(viewings);
        }, (error) => {
            console.error('Error loading viewings:', error);
            showError('Failed to load your viewings. Please refresh the page.');
        });

    } catch (error) {
        console.error('Error setting up viewings listener:', error);
        showError('Failed to load your viewings.');
    }
}

// Render viewings in the UI
function renderViewings(viewings) {
    const container = document.querySelector('section');
    if (!container) return;

    // Preserve header elements
    const header = container.querySelector('h2');
    const description = container.querySelector('p');
    
    // Clear container
    container.innerHTML = '';
    
    // Re-add header elements
    if (header) container.appendChild(header);
    if (description) container.appendChild(description);

    // Show message if no viewings
    if (!viewings.length) {
        const noViewingsMsg = document.createElement('div');
        noViewingsMsg.className = 'text-center py-8 text-gray-500';
        noViewingsMsg.innerHTML = `
            <i class="fas fa-calendar-times text-4xl mb-4"></i>
            <p class="text-lg">No viewings scheduled yet.</p>
            <p class="text-sm">Book your first property viewing to get started!</p>
        `;
        container.appendChild(noViewingsMsg);
        return;
    }

    // Separate upcoming and past viewings
    const now = new Date();
    const upcomingViewings = viewings.filter(viewing => new Date(viewing.date.seconds * 1000) > now);
    const pastViewings = viewings.filter(viewing => new Date(viewing.date.seconds * 1000) <= now);

    // Render upcoming viewings
    if (upcomingViewings.length > 0) {
        const upcomingHeader = document.createElement('h3');
        upcomingHeader.className = 'text-xl sm:text-2xl font-semibold text-gray-700 mb-4';
        upcomingHeader.textContent = 'Upcoming Viewings';
        container.appendChild(upcomingHeader);

        upcomingViewings.forEach(viewing => {
            container.appendChild(createViewingCard(viewing, true));
        });
    }

    // Render past viewings
    if (pastViewings.length > 0) {
        const pastHeader = document.createElement('h3');
        pastHeader.className = 'text-xl sm:text-2xl font-semibold text-gray-700 mb-4 mt-8';
        pastHeader.textContent = 'Past Viewings';
        container.appendChild(pastHeader);

        pastViewings.forEach(viewing => {
            container.appendChild(createViewingCard(viewing, false));
        });
    }
}

// Create viewing card element
function createViewingCard(viewing, isUpcoming) {
    const card = document.createElement('div');
    const borderColor = getStatusBorderColor(viewing.status);
    const isExpired = new Date(viewing.date.seconds * 1000) < new Date();
    
    card.className = `viewing-card bg-white rounded-2xl p-5 mb-5 shadow-lg border-l-4 ${borderColor}`;
    card.dataset.viewingId = viewing.id;

    // Format date and time from your structure
    const viewingDate = new Date(viewing.date.seconds * 1000);
    const formattedDateTime = formatDateTimeFromBooking(viewingDate, viewing.time);

    card.innerHTML = `
        <h3 class="text-lg sm:text-xl font-bold text-gray-800 mb-2">${escapeHtml(viewing.propertyTitle || 'Property')}</h3>
        <p class="text-sm text-gray-600 mb-1"><strong class="font-medium">Location:</strong> ${escapeHtml(viewing.propertyLocation || 'N/A')}</p>
        <p class="text-sm text-gray-600 mb-1"><strong class="font-medium">Date & Time:</strong> ${formattedDateTime}</p>
        <p class="text-sm text-gray-600 mb-1"><strong class="font-medium">Contact:</strong> ${escapeHtml(viewing.name || 'N/A')} - ${escapeHtml(viewing.phone || 'N/A')}</p>
        <p class="text-sm"><strong class="font-medium">Status:</strong> ${getStatusBadge(viewing.status)}</p>
        ${viewing.notes ? `<p class="text-sm text-gray-600 mt-2"><strong class="font-medium">Notes:</strong> ${escapeHtml(viewing.notes)}</p>` : ''}
        ${createActionButtons(viewing, isUpcoming && !isExpired)}
    `;

    return card;
}

// Create action buttons based on viewing status and timing
function createActionButtons(viewing, canModify) {
    if (!canModify) {
        return '<div class="mt-4"></div>';
    }

    const isPending = viewing.status === 'pending';
    const isConfirmed = viewing.status === 'confirmed';

    if (isPending) {
        return `
            <div class="action-buttons mt-4 flex flex-col sm:flex-row gap-2">
                <button onclick="editViewing('${viewing.id}')" class="btn-reschedule px-4 py-2 rounded-xl text-sm font-semibold transition-colors duration-200 text-center bg-blue-50 text-blue-600 border border-blue-400 hover:bg-blue-100">Edit Request</button>
                <button onclick="cancelViewing('${viewing.id}')" class="btn-cancel px-4 py-2 rounded-xl text-sm font-semibold transition-colors duration-200 text-center bg-red-50 text-red-600 border border-red-400 hover:bg-red-100">Cancel Request</button>
            </div>
        `;
    } else if (isConfirmed) {
        return `
            <div class="action-buttons mt-4 flex flex-col sm:flex-row gap-2">
                <button onclick="rescheduleViewing('${viewing.id}')" class="btn-reschedule px-4 py-2 rounded-xl text-sm font-semibold transition-colors duration-200 text-center bg-blue-50 text-blue-600 border border-blue-400 hover:bg-blue-100">Reschedule</button>
                <button onclick="cancelViewing('${viewing.id}')" class="btn-cancel px-4 py-2 rounded-xl text-sm font-semibold transition-colors duration-200 text-center bg-red-50 text-red-600 border border-red-400 hover:bg-red-100">Cancel</button>
            </div>
        `;
    }

    return '<div class="mt-4"></div>';
}

// Get status-specific border color
function getStatusBorderColor(status) {
    switch (status) {
        case 'confirmed':
            return 'border-green-500';
        case 'pending':
            return 'border-yellow-500';
        case 'cancelled':
            return 'border-red-500';
        case 'completed':
            return 'border-gray-500';
        default:
            return 'border-blue-500';
    }
}

// Get status badge HTML
function getStatusBadge(status) {
    switch (status) {
        case 'confirmed':
            return '<span class="font-bold text-green-600">Confirmed</span>';
        case 'pending':
            return '<span class="font-bold text-yellow-600">Pending Approval</span>';
        case 'cancelled':
            return '<span class="font-bold text-red-600">Cancelled</span>';
        case 'completed':
            return '<span class="font-bold text-gray-600">Completed</span>';
        default:
            return '<span class="font-bold text-blue-600">Unknown</span>';
    }
}

// Format date and time for display (updated for your data structure)
function formatDateTimeFromBooking(date, timeString) {
    const options = { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    };

    const formattedDate = date.toLocaleDateString('en-US', options);
    return `${formattedDate} at ${timeString}`;
}

// Format date and time for display (legacy function kept for compatibility)
function formatDateTime(startDate, endDate) {
    const options = { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    };
    const timeOptions = { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
    };

    const formattedDate = startDate.toLocaleDateString('en-US', options);
    const startTime = startDate.toLocaleTimeString('en-US', timeOptions);
    const endTime = endDate.toLocaleTimeString('en-US', timeOptions);

    return `${formattedDate} at ${startTime} - ${endTime}`;
}

// Add new viewing (updated for your collection structure)
async function addViewing(viewingData) {
    if (!currentUser) {
        showError('Please log in to book a viewing.');
        return false;
    }

    try {
        const docRef = await addDoc(collection(db, 'viewingBookings'), {
            userId: currentUser.uid,
            userEmail: currentUser.email,
            email: viewingData.email || currentUser.email,
            name: viewingData.name || '',
            phone: viewingData.phone || '',
            propertyId: viewingData.propertyId || '',
            propertyTitle: viewingData.propertyTitle || '',
            propertyLocation: viewingData.propertyLocation || '',
            date: viewingData.date, // Should be a Firestore timestamp
            dateString: viewingData.dateString || '',
            time: viewingData.time || '',
            status: 'pending',
            notes: viewingData.notes || '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        showSuccess('Viewing request submitted successfully!');
        return docRef.id;
    } catch (error) {
        console.error('Error adding viewing:', error);
        showError('Failed to submit viewing request. Please try again.');
        return false;
    }
}

// Update viewing
async function updateViewing(viewingId, updateData) {
    if (!currentUser) {
        showError('Please log in to update viewing.');
        return false;
    }

    try {
        await updateDoc(doc(db, 'viewingBookings', viewingId), {
            ...updateData,
            updatedAt: serverTimestamp()
        });

        showSuccess('Viewing updated successfully!');
        return true;
    } catch (error) {
        console.error('Error updating viewing:', error);
        showError('Failed to update viewing. Please try again.');
        return false;
    }
}

// Cancel viewing
async function cancelViewing(viewingId) {
    if (!confirm('Are you sure you want to cancel this viewing?')) {
        return;
    }

    const success = await updateViewing(viewingId, {
        status: 'cancelled'
    });

    if (success) {
        showSuccess('Viewing cancelled successfully.');
    }
}

// Reschedule viewing
async function rescheduleViewing(viewingId) {
    showInfo('Reschedule functionality would open a date/time picker here.');
    await updateViewing(viewingId, {
        status: 'pending'
    });
}

// Edit viewing
async function editViewing(viewingId) {
    showInfo('Edit functionality would open an edit form here.');
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

function showSuccess(message) {
    showNotification(message, 'success');
}

function showError(message) {
    showNotification(message, 'error');
}

function showInfo(message) {
    showNotification(message, 'info');
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${getNotificationClasses(type)}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Remove after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

function getNotificationClasses(type) {
    switch (type) {
        case 'success':
            return 'bg-green-100 text-green-800 border border-green-300';
        case 'error':
            return 'bg-red-100 text-red-800 border border-red-300';
        case 'info':
            return 'bg-blue-100 text-blue-800 border border-blue-300';
        default:
            return 'bg-gray-100 text-gray-800 border border-gray-300';
    }
}

function showLoginPrompt() {
    const container = document.querySelector('section');
    if (!container) return;

    container.innerHTML = `
        <div class="text-center py-8">
            <i class="fas fa-user-lock text-4xl text-gray-400 mb-4"></i>
            <h3 class="text-xl font-semibold text-gray-700 mb-2">Please Log In</h3>
            <p class="text-gray-500 mb-4">You need to be logged in to view your appointments.</p>
            <button onclick="window.location.href='/login'" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Log In
            </button>
        </div>
    `;
}

// Cleanup function
function cleanup() {
    if (viewingsListener) {
        viewingsListener();
        viewingsListener = null;
    }
}

// Make functions globally available
window.addViewing = addViewing;
window.updateViewing = updateViewing;
window.cancelViewing = cancelViewing;
window.rescheduleViewing = rescheduleViewing;
window.editViewing = editViewing;

// Cleanup on page unload
window.addEventListener('beforeunload', cleanup);