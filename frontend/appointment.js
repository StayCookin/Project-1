import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
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
  measurementId: "G-JY9E760ZQ0",
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
  CONFIRMED: "confirmed",
  PENDING: "pending",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
};

// Initialize the application
document.addEventListener("DOMContentLoaded", function () {
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
  if (!currentUser) {
    console.log("DEBUG: No current user");
    return;
  }

  console.log("DEBUG: Current user ID:", currentUser.uid);
  console.log("DEBUG: Current user email:", currentUser.email);

  try {
    // First, let's check what data exists in the collection
    const allViewingsQuery = query(
      collection(db, "viewingBookings"),
      orderBy("createdAt", "desc")
    );

    const allSnapshot = await getDocs(allViewingsQuery);
    console.log("DEBUG: Total documents in viewingBookings:", allSnapshot.size);

    allSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log("DEBUG: Document data:", {
        id: doc.id,
        landlordId: data.landlordId,
        userId: data.userId,
        propertyTitle: data.propertyTitle,
        status: data.status,
      });
    });

    // Now try the landlord-specific query
    const viewingsQuery = query(
      collection(db, "viewingBookings"),
      where("landlordId", "==", currentUser.uid),
      orderBy("date", "asc")
    );

    console.log("DEBUG: Setting up student query for:", currentUser.uid);

    // Clear existing listener
    if (viewingsListener) {
      viewingsListener();
      viewingsListener = null;
    }

    // Set up real-time listener
    viewingsListener = onSnapshot(
      viewingsQuery,
      (snapshot) => {
        console.log("DEBUG: Query snapshot size:", snapshot.size);

        const viewings = [];
        snapshot.forEach((doc) => {
          const viewing = {
            id: doc.id,
            ...doc.data(),
          };
          console.log("DEBUG: Found viewing for landlord:", viewing);
          viewings.push(viewing);
        });

        console.log("DEBUG: Total viewings for landlord:", viewings.length);
        renderViewings(viewings);
      },
      (error) => {
        console.error("DEBUG: Error in snapshot listener:", error);
        showError("Failed to load your viewings. Please refresh the page.");
      }
    );
  } catch (error) {
    console.error("DEBUG: Error setting up viewings listener:", error);
    showError("Failed to load your viewings.");
  }
}

async function acceptViewing(viewingId) {
  if (!currentUser) {
    showError("Please Log in to accept viewings");
    return false;
  }

  if (!confirm("Are you sure you want to accept this request?")) {
    return;
  }

  try {
    const success = await updateViewing(viewingId, {
      status: VIEWING_STATUS.CONFIRMED,
      confirmedAt: serverTimestamp(),
      confirmedBy: currentUser.uid,
    });

    if (success) {
      showSuccess("Viewing request accepted successfully!");
      await sendNotificationToStudent(viewingId, "accepted");
    }
    return success;
  } catch (error) {
    console.error("Error accepting viewing", error);
    showError("Failed to accept viewing requset. Please try again.");
    return false;
  }
}
const NOTIFICATION_TYPES = {
  VIEWING_ACCEPTED: "viewing_accepted",
  VIEWING_REJECTED: "viewing_rejected",
  VIEWING_CANCELLED: "viewing_cancelled",
  VIEWING_RESCHEDULED: "viewing_rescheduled",
  VIEWING_REMINDER: "viewing_reminder",
};

async function sendNotificationToStudent(
  viewingId,
  notificationType,
  additionalData = {}
) {
  try {
    const viewingData = await getViewingById(viewingId);
    if (!viewingData) {
      console.error("Viewing not found:", viewingId);
      return false;
    }

    const inAppSuccess = await createInAppNotification(
      viewingData,
      notificationType,
      additionalData
    );
    const emailSuccess = await sendEmailNotification(
      viewingData,
      notificationType,
      additionalData
    );

    await logNotificatoinActivity(viewingId, notificationType, {
      inAppSent: inAppSuccess,
      emailSent: emailSuccess,
      recipientId: viewingData.userId,
      recipientEmail: viewingData.email,
    });

    return inAppSuccess || emailSuccess;
  } catch (error) {
    console.error("Error sending notification to student:", error);
    return false;
  }
}

async function getViewingById(viewingId) {
  try {
    const viewingQuery = query(
      collection(db, "viewingBookings"),
      where("__name__", "==", viewingId)
    );

    const snapshot = await getDocs(viewingQuery);
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      };
    }
    return null;
  } catch (error) {
    console.error("Error getting viewing by id:", error);
    return null;
  }
}

async function createInAppNotification(
  viewingData,
  notificatoinType,
  additionalData
) {
  try {
    const notification = {
      userId: viewingData.userId,
      type: notificationType,
      title: getNotificationTitle(notificatoinType, viewingData),
      message: getNotificationMessage(
        notificationType,
        viewingData,
        additionalData
      ),
      relatedViewingId: viewingData.id,
      propertyTitle: viewingData.propertyTitle,
      propertyLocation: viewingData.propertyLocation,
      landlordId: viewingData.landlordId,
      isRead: false,
      createdAt: serverTimestamp(),
      scheduledDate: viewingData.date,
      scheduledTime: viewingData.time,
      ...additionalData,
    };

    const docRef = await addDoc(collection(db, "notifications"), notification);
    console.log("In-app notification created:", docRef.id);
    return true;
  } catch (error) {
    console.error("Error creating in-app notification", error);
    return false;
  }
}

async function sendEmailNotification(
  viewingData,
  notificationType,
  additionalData
) {
  try {
    if (!viewingData.email) {
      console.log("No email address available for notification");
      return false;
    }

    const emailData = {
      to: viewingData.email,
      subject: getEmailSubject(notificationType, viewingData),
      html: getEmailTemplate(notificaitonType, viewingData, additionalData),
      notificatoinType: notificationType,
      viewingId: viewingData.id,
      userId: viewingData.userId,
    };
    //add mailgun!!
    await addDoc(collection(db, "emailQueue"), {
      ...emailData,
      status: "pending",
      createdAt: serverTimestamp(),
      attempts: 0,
    });

    console.log("Email notification queued for:", viewingData.email);
    return true;
  } catch (error) {
    console.error("cant send email", error);
    showError("Contact support");
    return;
  }
}

async function logNotificatoinActivity(viewingId, notificatoinType, metadata) {
  try {
    await addDoc(collection(db, "notificationLogs"), {
      viewingId: viewingId,
      type: notificationType,
      metadata: metadata,
      timestamp: serverTimestamp(),
      landlordId: currentUser?.uid,
    });
  } catch (error) {
    console.error("Error logging notificaiton activity");
  }
}

function getNotificationTitle(type, viewingData) {
  const propertyTitle = viewingData.propertyTitle || "Property Viewing";

  switch (type) {
    case NOTIFICATION_TYPES.VIEWING_ACCEPTED:
      return `✅ Viewing Request Accepted - ${propertyTitle}`;
    case NOTIFICATION_TYPES.VIEWING_REJECTED:
      return `❌ Viewing Request Declined - ${propertyTitle}`;
    case NOTIFICATION_TYPES.VIEWING_CANCELLED:
      return `🚫 Viewing Cancelled - ${propertyTitle}`;
    case NOTIFICATION_TYPES.VIEWING_RESCHEDULED:
      return `📅 Viewing Rescheduled - ${propertyTitle}`;
    case NOTIFICATION_TYPES.VIEWING_REMINDER:
      return `⏰ Upcoming Viewing Reminder - ${propertyTitle}`;
    default:
      return `📬 Viewing Update - ${propertyTitle}`;
  }
}

function getNotificationMessage(type, viewingData, additionalData = {}) {
  const propertyTitle = viewingData.propertyTitle || "the property";
  const propertyLocation =
    viewingData.propertyLocation || "the specified location";
  const viewingDate = viewingData.date
    ? new Date(viewingData.date.seconds * 1000)
    : new Date();
  const formattedDate = formateDateTImeFromBooking(
    viewingDate,
    viewingData.time
  );

  switch (type) {
    case NOTIFICATION_TYPES.VIEWING_ACCEPTED:
      return `Great news! Your viewing request for ${propertyTitle} at ${propertyLocation} has been accepted. Your viewing is scheduled for ${formattedDate}. Please arrive on time and bring a valid ID.`;

    case NOTIFICATION_TYPES.VIEWING_REJECTED:
      return `We regret to inform you that your viewing request for ${propertyTitle} at ${propertyLocation} has been declined. ${
        additionalData.reason ||
        "Please contact the landlord for more information or try booking an alternative time."
      }`;

    case NOTIFICATION_TYPES.VIEWING_CANCELLED:
      return `Your viewing for ${propertyTitle} at ${propertyLocation} scheduled for ${formattedDate} has been cancelled. ${
        additionalData.reason ||
        "Please contact the landlord to reschedule or for more information."
      }`;

    case NOTIFICATION_TYPES.VIEWING_RESCHEDULED:
      const newDate = additionalData.newDate
        ? new Date(additionalData.newDate.seconds * 1000)
        : null;
      const newFormattedDate = newDate
        ? formatDateTimeFromBooking(newDate, additionalData.newTime)
        : "a new date and time";
      return `Your viewing for ${propertyTitle} has been rescheduled to ${newFormattedDate}. Please update your calendar accordingly.`;

    case NOTIFICATION_TYPES.VIEWING_REMINDER:
      return `Reminder: You have a viewing for ${propertyTitle} at ${propertyLocation} scheduled for ${formattedDate}. Don't forget to bring a valid ID!`;

    default:
      return `There has been an update regarding your viewing for ${propertyTitle}.`;
  }
}

function getEmailSubject(type, viewingData) {
  const propertyTitle = viewingData.propertyTitle || "Property";

  switch (type) {
    case NOTIFICATION_TYPES.VIEWING_ACCEPTED:
      return `Viewing Request Accepted - ${propertyTitle}`;
    case NOTIFICATION_TYPES.VIEWING_REJECTED:
      return `Viewing Request Update - ${propertyTitle}`;
    case NOTIFICATION_TYPES.VIEWING_CANCELLED:
      return `Viewing Cancelled - ${propertyTitle}`;
    case NOTIFICATION_TYPES.VIEWING_RESCHEDULED:
      return `Viewing Rescheduled - ${propertyTitle}`;
    case NOTIFICATION_TYPES.VIEWING_REMINDER:
      return `Viewing Reminder - ${propertyTitle}`;
    default:
      return `Viewing Update - ${propertyTitle}`;
  }
}

function getEMailTemplate(type, viewingData, additionalData = {}) {
  const propertyTitle = viewingData.propertyTitle || "Property";
  const propertyLocatoin =
    viewingData.propertyLocation || "Location not specified";
  const studentName = viewingData.name || "Dear student";
  const viewingDate = viewingData.date
    ? new Date(viewingData.date.seconds * 1000)
    : new Date();
  const formattedDate = formatDateTimeFromBooking(
    viewingDate,
    viewingData.time
  );

  const baseTemplate = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #333; margin: 0;">InRent</h1>
                    <p style="color: #666; margin: 5px 0;">Property Viewing Update</p>
                </div>
                
                <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
                    ${getNotificationTitle(type, viewingData)}
                </h2>
                
                <p style="color: #333; font-size: 16px; line-height: 1.5;">
                    Hi ${studentName},
                </p>
                
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                    <h3 style="color: #333; margin-top: 0;">Property Details:</h3>
                    <p style="margin: 5px 0;"><strong>Property:</strong> ${propertyTitle}</p>
                    <p style="margin: 5px 0;"><strong>Location:</strong> ${propertyLocation}</p>
                    <p style="margin: 5px 0;"><strong>Scheduled Date & Time:</strong> ${formattedDate}</p>
                </div>
                
                <div style="color: #333; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                    ${getNotificationMessage(type, viewingData, additionalData)}
                </div>
    `;

  let ctaSection = "";
  let footerColor = "black";

  switch (type) {
    case NOTIFICATION_TYPES.VIEWING_ACCEPTED:
      footerColor = "#28a745";
      ctaSection = `
                <div style="text-align: center; margin: 30px 0;">
                    <div style="background-color: #d4edda; color: #155724; padding: 15px; border-radius: 5px; border-left: 4px solid #28a745;">
                        <strong>🎉 Viewing Confirmed!</strong><br>
                        Your viewing has been approved. Please arrive on time and bring a valid form of ID.
                    </div>
                </div>
            `;
      break;

    case NOTIFICATION_TYPES.VIEWING_REJECTED:
      footerColor = "#dc3545";
      ctaSection = `
                <div style="text-align: center; margin: 30px 0;">
                    <div style="background-color: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; border-left: 4px solid #dc3545;">
                        <strong>Viewing Request Declined</strong><br>
                        Don't worry! There are many other properties available. Keep searching for your perfect home.
                    </div>
                </div>
            `;
      break;

    case NOTIFICATION_TYPES.VIEWING_REMINDER:
      footerColor = "#ffc107";
      ctaSection = `
                <div style="text-align: center; margin: 30px 0;">
                    <div style="background-color: #fff3cd; color: #856404; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107;">
                        <strong>⏰ Don't Forget!</strong><br>
                        Your viewing is coming up soon. Set a reminder and prepare any questions you'd like to ask.
                    </div>
                </div>
            `;
      break;
  }

  const footer = `
                ${ctaSection}
                
                <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center; color: #666;">
                    <p style="margin: 10px 0;">Need help? Contact our support team.</p>
                    <p style="font-size: 14px; margin: 0;">
                        This is an automated message from InRent. Please do not reply to this email.
                    </p>
                </div>
                
                <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
                    <p style="color: ${footerColor}; font-weight: bold; margin: 0;">
                        InRent - Your Student Housing Platform
                    </p>
                </div>
            </div>
        </div>
    `;
  return baseTemplate + footer;
}

async function acceptViewingWithNotification(viewingId) {
  if (!currentUser) {
    showError("Please log in to accept viewings");
    return false;
  }

  if (!confirm("Are you sure you want to accept this viewing request")) {
    return;
  }
  try {
    const success = await updateViewing(viewingId, {
      status: VIEWING_STATUS.CONFIRMED,
      confirmedAt: serverTimestamp(),
      confirmedBy: currentUser.uid,
    });

    if (success) {
      await sendNotificationToStudent(
        viewingId,
        NOTIFICATION_TYPES.VIEWING_ACCEPTED
      );
      showSuccess("Viewing request accepted and student notified!");
    }
    return success;
  } catch (error) {
    console.error("Error accepting viewing:", error);
    showError("Failed to accept viewing request. Please try again.");
    return false;
  }
}
const customReason =
  reason || prompt("Optional: Provide a reason for rejection");

if (
  !confirm(
    "Are you sure you want to reject this viewing request? The student will be notified"
  )
) {
  return;
}
try {
  await sendNotificationToStudent(
    viewingId,
    NOTIFICATION_TYPES.VIEWING_REJECTED,
    {
      reason: customReason,
    }
  );
  await deleteDoc(doc(db, "viewingBookings", viewingId));

  showSuccess("Viewing request rejected and student notified.");
  return true;
} catch (error) {
  console.error("Error rejecting viewing:", error);
  showError("Failed to reject viewing request. Please try again.");
  return false;
}
async function scheduleViewingReminder(viewingId) {
  try {
    const viewingData = await getViewingById(viewingId);
    if (!viewingData || viewingData.status !== VIEWING_STATUS.CONFIRMED) {
      return false;
    }

    // Schedule reminder for 1 day before viewing
    const viewingDate = new Date(viewingData.date.seconds * 1000);
    const reminderDate = new Date(viewingDate.getTime() - 24 * 60 * 60 * 1000); // 24 hours before

    await addDoc(collection(db, "scheduledNotifications"), {
      viewingId: viewingId,
      userId: viewingData.userId,
      type: NOTIFICATION_TYPES.VIEWING_REMINDER,
      scheduledFor: reminderDate,
      status: "pending",
      createdAt: serverTimestamp(),
    });

    console.log("Reminder scheduled for viewing:", viewingId);
    return true;
  } catch (error) {
    console.error("Error scheduling reminder:", error);
    return false;
  }
}

// Make functions globally available
window.sendNotificationToStudent = sendNotificationToStudent;
window.acceptViewingWithNotification = acceptViewingWithNotification;
window.rejectViewingWithNotification = rejectViewingWithNotification;
window.scheduleViewingReminder = scheduleViewingReminder;
window.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
async function rejectViewing(viewingId) {
  if (!currentUser) {
    showError("Please log in to reject viewings.");
    return false;
  }
  if (!confirm("Are you sure you want to reject this viewing request?")) {
    return;
  }

  try {
    await deleteDoc(doc(db, "viewingBookings", viewingId));

    showSuccess("Viewing request rejected and deleted successfully.");
    await sendNotificationToStudent(viewingId, "rejected, reschedule");
    return true;
  } catch (error) {
    console.error("Error rejecting viewing", error);
    showError("Failed to reject viewing request. Please try again.");
    return false;
  }
}

// Render viewings in the UI
function renderViewings(viewings) {
  console.log("DEBUG: Rendering viewings:", viewings.length);

  const container = document.querySelector("section");
  if (!container) {
    console.log("DEBUG: No section container found");
    return;
  }

  // Preserve header elements
  const header = container.querySelector("h2");
  const description = container.querySelector("p");

  // Clear container
  container.innerHTML = "";

  // Re-add header elements
  if (header) container.appendChild(header);
  if (description) container.appendChild(description);

  // Add debug info

  // Show message if no viewings
  if (!viewings.length) {
    const noViewingsMsg = document.createElement("div");
    noViewingsMsg.className = "text-center py-8 text-gray-500";
    noViewingsMsg.innerHTML = `
            <i class="fas fa-calendar-times text-4xl mb-4"></i>
            <p class="text-lg">No viewing requests yet.</p>
            <p class="text-sm">Waiting for tenants to book viewings for your properties.</p>
        `;
    container.appendChild(noViewingsMsg);
    return;
  }

  // Continue with normal rendering...
  const now = new Date();
  const upcomingViewings = viewings.filter(
    (viewing) => new Date(viewing.date.seconds * 1000) > now
  );
  const pastViewings = viewings.filter(
    (viewing) => new Date(viewing.date.seconds * 1000) <= now
  );

  // Render upcoming viewings
  if (upcomingViewings.length > 0) {
    const upcomingHeader = document.createElement("h3");
    upcomingHeader.className =
      "text-xl sm:text-2xl font-semibold text-gray-700 mb-4";
    upcomingHeader.textContent = "Upcoming Viewing Requests";
    container.appendChild(upcomingHeader);

    upcomingViewings.forEach((viewing) => {
      container.appendChild(createViewingCard(viewing, true));
    });
  }

  // Render past viewings
  if (pastViewings.length > 0) {
    const pastHeader = document.createElement("h3");
    pastHeader.className =
      "text-xl sm:text-2xl font-semibold text-gray-700 mb-4 mt-8";
    pastHeader.textContent = "Past Viewing Requests";
    container.appendChild(pastHeader);

    pastViewings.forEach((viewing) => {
      container.appendChild(createViewingCard(viewing, false));
    });
  }
}

// Create viewing card element
function createViewingCard(viewing, isUpcoming) {
  const card = document.createElement("div");
  const borderColor = getStatusBorderColor(viewing.status);
  const isExpired = new Date(viewing.date.seconds * 1000) < new Date();

  card.className = `viewing-card bg-white rounded-2xl p-5 mb-5 shadow-lg border-l-4 ${borderColor}`;
  card.dataset.viewingId = viewing.id;

  // Format date and time from your structure
  const viewingDate = new Date(viewing.date.seconds * 1000);
  const formattedDateTime = formatDateTimeFromBooking(
    viewingDate,
    viewing.time
  );

  card.innerHTML = `
        <h3 class="text-lg sm:text-xl font-bold text-gray-800 mb-2">${escapeHtml(
          viewing.propertyTitle || "Property"
        )}</h3>
        <p class="text-sm text-gray-600 mb-1"><strong class="font-medium">Location:</strong> ${escapeHtml(
          viewing.propertyLocation || "N/A"
        )}</p>
        <p class="text-sm text-gray-600 mb-1"><strong class="font-medium">Date & Time:</strong> ${formattedDateTime}</p>
        <p class="text-sm text-gray-600 mb-1"><strong class="font-medium">Contact:</strong> ${escapeHtml(
          viewing.name || "N/A"
        )} - ${escapeHtml(viewing.phone || "N/A")}</p>
        <p class="text-sm"><strong class="font-medium">Status:</strong> ${getStatusBadge(
          viewing.status
        )}</p>
        ${
          viewing.notes
            ? `<p class="text-sm text-gray-600 mt-2"><strong class="font-medium">Notes:</strong> ${escapeHtml(
                viewing.notes
              )}</p>`
            : ""
        }
        ${createActionButtons(viewing, isUpcoming && !isExpired)}
    `;

  return card;
}

// Create action buttons based on viewing status and timing
function createActionButtons(viewing, canModify) {
  if (!canModify) {
    return '<div class="mt-4"></div>';
  }

  const isPending = viewing.status === "pending";
  const isConfirmed = viewing.status === "confirmed";

  if (isPending) {
    return `
            <div class="action-buttons mt-4 flex flex-col sm:flex-row gap-2">
                <button onclick="acceptViewing('${viewing.id}')" class="btn-accept px-4 py-2 rounded-xl text-sm font-semibold transition-colors duration-200 text-center bg-green-50 text-green-600 border border-green-400 hover:bg-green-100">Accept Request</button>
                <button onclick="rejectViewing('${viewing.id}')" class="btn-reject px-4 py-2 rounded-xl text-sm font-semibold transition-colors duration-200 text-center bg-red-50 text-red-600 border border-red-400 hover:bg-red-100">Reject Request</button>
                <button onclick="editViewing('${viewing.id}')" class="btn-edit px-4 py-2 rounded-xl text-sm font-semibold transition-colors duration-200 text-center bg-blue-50 text-blue-600 border border-blue-400 hover:bg-blue-100">Edit Details</button>
            </div>
        `;
  } else if (isConfirmed) {
    return `
            <div class="action-buttons mt-4 flex flex-col sm:flex-row gap-2">
                <button onclick="rescheduleViewing('${viewing.id}')" class="btn-reschedule px-4 py-2 rounded-xl text-sm font-semibold transition-colors duration-200 text-center bg-blue-50 text-blue-600 border border-blue-400 hover:bg-blue-100">Reschedule</button>
                <button onclick="cancelViewing('${viewing.id}')" class="btn-cancel px-4 py-2 rounded-xl text-sm font-semibold transition-colors duration-200 text-center bg-red-50 text-red-600 border border-red-400 hover:bg-red-100">Cancel</button>
                <button onclick="markAsCompleted('${viewing.id}')" class="btn-completed px-4 py-2 rounded-xl text-sm font-semibold transition-colors duration-200 text-center bg-gray-50 text-gray-600 border border-gray-400 hover:bg-gray-100">Mark as Completed</button>
            </div>
        `;
  }

  return '<div class="mt-4"></div>';
}
async function markAsCompleted(viewingId) {
  if (!confirm("Mark this viewing as completed?")) {
    return;
  }
  const success = await updateViewing(viewingId, {
    status: VIEWING_STATUS.COMPLETED,
    completedAt: serverTimestamp(),
    completedBy: currentUser.uid,
  });

  if (success) {
    showSuccess("Viewing marked as completed.");
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const acceptBtn = document.getElementById("acceptBtn");
  const rejectBtn = document.getElementById("rejectBtn");

  if (acceptBtn) {
    acceptBtn.addEventListener("click", function (e) {
      e.preventDefault();
      const viewingId = this.dataset.viewingId;
      if (viewingId) {
        acceptViewing(viewingId);
      } else {
        showError("No viewing ID found.");
      }
    });
  }
  if (rejectBtn) {
    rejectBtn.addEventListener("click", function (e) {
      e.preventDefault();
      const viewingId = this.dataset.viewingId;
      if (viewingId) {
        rejectViewing(viewingId);
      } else {
        showError("No viewing Id found");
      }
    });
  }
});

window.acceptViewing = acceptViewing;
window.rejectViewing = rejectViewing;
window.rejectViewingKeepRecord = rejectViewingKeepRecord;
window.markAsCompleted = markAsCompleted;

// Get status-specific border color
function getStatusBorderColor(status) {
  switch (status) {
    case "confirmed":
      return "border-green-500";
    case "pending":
      return "border-yellow-500";
    case "cancelled":
      return "border-red-500";
    case "completed":
      return "border-gray-500";
    default:
      return "border-blue-500";
  }
}

// Get status badge HTML
function getStatusBadge(status) {
  switch (status) {
    case "confirmed":
      return '<span class="font-bold text-green-600">Confirmed</span>';
    case "pending":
      return '<span class="font-bold text-yellow-600">Pending Approval</span>';
    case "cancelled":
      return '<span class="font-bold text-red-600">Cancelled</span>';
    case "completed":
      return '<span class="font-bold text-gray-600">Completed</span>';
    default:
      return '<span class="font-bold text-blue-600">Unknown</span>';
  }
}

// Format date and time for display (updated for your data structure)
function formatDateTimeFromBooking(date, timeString) {
  const options = {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  };

  const formattedDate = date.toLocaleDateString("en-US", options);
  return `${formattedDate} at ${timeString}`;
}

// Format date and time for display (legacy function kept for compatibility)
function formatDateTime(startDate, endDate) {
  const options = {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  };
  const timeOptions = {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };

  const formattedDate = startDate.toLocaleDateString("en-US", options);
  const startTime = startDate.toLocaleTimeString("en-US", timeOptions);
  const endTime = endDate.toLocaleTimeString("en-US", timeOptions);

  return `${formattedDate} at ${startTime} - ${endTime}`;
}

// Add new viewing (updated for your collection structure)
async function addViewing(viewingData) {
  if (!currentUser) {
    showError("Please log in to book a viewing.");
    return false;
  }

  try {
    const docRef = await addDoc(collection(db, "viewingBookings"), {
      userId: currentUser.uid,
      userEmail: currentUser.email,
      email: viewingData.email || currentUser.email,
      name: viewingData.name || "",
      phone: viewingData.phone || "",
      propertyId: viewingData.propertyId || "",
      propertyTitle: viewingData.propertyTitle || "",
      propertyLocation: viewingData.propertyLocation || "",
      date: viewingData.date, // Should be a Firestore timestamp
      dateString: viewingData.dateString || "",
      time: viewingData.time || "",
      status: "pending",
      notes: viewingData.notes || "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    showSuccess("Viewing request submitted successfully!");
    return docRef.id;
  } catch (error) {
    console.error("Error adding viewing:", error);
    showError("Failed to submit viewing request. Please try again.");
    return false;
  }
}

// Update viewing
async function updateViewing(viewingId, updateData) {
  if (!currentUser) {
    showError("Please log in to update viewing.");
    return false;
  }

  try {
    await updateDoc(doc(db, "viewingBookings", viewingId), {
      ...updateData,
      updatedAt: serverTimestamp(),
    });

    showSuccess("Viewing updated successfully!");
    return true;
  } catch (error) {
    console.error("Error updating viewing:", error);
    showError("Failed to update viewing. Please try again.");
    return false;
  }
}

// Cancel viewing
async function cancelViewing(viewingId) {
  if (!confirm("Are you sure you want to cancel this viewing?")) {
    return;
  }

  const success = await updateViewing(viewingId, {
    status: "cancelled",
  });

  if (success) {
    showSuccess("Viewing cancelled successfully.");
  }
}

// Reschedule viewing
async function rescheduleViewing(viewingId) {
  showInfo("Reschedule functionality would open a date/time picker here.");
  await updateViewing(viewingId, {
    status: "pending",
  });
}

// Edit viewing
async function editViewing(viewingId) {
  showInfo("Edit functionality would open an edit form here.");
}

// Utility functions
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}

function showSuccess(message) {
  showNotification(message, "success");
}

function showError(message) {
  showNotification(message, "error");
}

function showInfo(message) {
  showNotification(message, "info");
}

function showNotification(message, type) {
  const notification = document.createElement("div");
  notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${getNotificationClasses(
    type
  )}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  // Remove after 5 seconds
  setTimeout(() => {
    notification.remove();
  }, 5000);
}

function getNotificationClasses(type) {
  switch (type) {
    case "success":
      return "bg-green-100 text-green-800 border border-green-300";
    case "error":
      return "bg-red-100 text-red-800 border border-red-300";
    case "info":
      return "bg-blue-100 text-blue-800 border border-blue-300";
    default:
      return "bg-gray-100 text-gray-800 border border-gray-300";
  }
}

function showLoginPrompt() {
  const container = document.querySelector("section");
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
window.addEventListener("beforeunload", cleanup);
