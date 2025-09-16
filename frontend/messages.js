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
  setDoc,
  updateDoc,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

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
let app;
let db;
let auth;
let currentUser = null;
let userProfile = null;
let conversations = [];
let activeConversationId = null;
let messageListeners = new Map();
let conversationsListener = null;

// Navigation context tracking
let navigationContext = {
  source: "messages",
  returnUrl: null,
};

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
} catch (error) {
  console.error("Firebase initialization failed:", error);
  showError("Failed to initialize Firebase services");
}

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Detect where we came from and setup back navigation
    detectNavigationContext();
    setupBackButton();

    // Wait for Firebase auth
    await waitForFirebaseAuth();

    // Load user profile
    await loadUserProfile();

    // Show initial loading in the main chat area while messages initialize
    const chatArea = document.getElementById("chatArea");
    if (chatArea) {
      chatArea.innerHTML =
        '<div class="text-center py-8 text-gray-500">Loading conversations...</div>';
    }

    // Start fetching messages with real-time updates
    await fetchMessages();

    // Handle contextual opening from sessionStorage
    handleContextualOpen();

    // Setup chat form submit handler (if present)
    // This allows the chat form to submit messages using chatInput and chatForm IDs
    const chatFormEl = document.getElementById("chatForm");
    if (chatFormEl) {
      chatFormEl.addEventListener("submit", function (e) {
        e.preventDefault();
        const chatInputEl = document.getElementById("chatInput");
        const messageText = (chatInputEl && chatInputEl.value ? chatInputEl.value : "").trim();
        if (messageText && activeConversationId) {
          sendMessageToConversation(activeConversationId, messageText);
          if (chatInputEl) chatInputEl.value = "";
        }
      });
    }
  } catch (error) {
    console.error("Messages initialization failed:", error);
    showError("Failed to initialize messages system");
  }
});

function detectNavigationContext() {
  const urlParams = new URLSearchParams(window.location.search);
  const referrer = document.referrer;
  const currentUrl = window.location.href;

  // Priority order for context detection:

  // 1. Explicit URL parameters (highest priority)
  if (urlParams.get("from") === "student-dashboard") {
    navigationContext.source = "student-dashboard";
    navigationContext.returnUrl = "student-dashboard.html";
  } else if (urlParams.get("from") === "landlord-dashboard") {
    navigationContext.source = "landlord-dashboard";
    navigationContext.returnUrl = "landlord-dashboard.html";
  } else if (urlParams.get("from") === "property-details") {
    navigationContext.source = "property-details";
    navigationContext.returnUrl =
      urlParams.get("returnUrl") || "properties.html";
  } else if (urlParams.get("from") === "profile") {
    navigationContext.source = "profile";
    navigationContext.returnUrl = urlParams.get("returnUrl") || "profile.html";
  } else if (urlParams.get("from") === "search") {
    navigationContext.source = "search";
    navigationContext.returnUrl = "search.html";
  }

  // 2. Check sessionStorage context (from property interactions)
  else if (sessionStorage.getItem("messageContext")) {
    const context = JSON.parse(sessionStorage.getItem("messageContext"));
    navigationContext.source = context.source || "unknown";
    navigationContext.returnUrl = context.returnUrl || null;
  }

  // 3. Referrer-based detection (fallback)
  else if (referrer) {
    if (referrer.includes("student-dashboard")) {
      navigationContext.source = "student-dashboard";
      navigationContext.returnUrl = "student-dashboard.html";
    } else if (referrer.includes("landlord-dashboard")) {
      navigationContext.source = "landlord-dashboard";
      navigationContext.returnUrl = "landlord-dashboard.html";
    } else if (
      referrer.includes("property-details") ||
      referrer.includes("properties")
    ) {
      navigationContext.source = "property-details";
      navigationContext.returnUrl = referrer;
    } else if (referrer.includes("profile")) {
      navigationContext.source = "profile";
      navigationContext.returnUrl = "profile.html";
    } else if (referrer.includes("search")) {
      navigationContext.source = "search";
      navigationContext.returnUrl = "search.html";
    } else if (referrer.includes("landlord-properties")) {
      navigationContext.source = "landlord-properties";
      navigationContext.returnUrl = "landlord-properties.html";
    } else {
      navigationContext.source = "external";
      navigationContext.returnUrl = null;
    }
  }

  // 4. Default case - direct navigation
  else {
    navigationContext.source = "direct";
    navigationContext.returnUrl = null;
  }

  // Log context for debugging
  console.log("Navigation context detected:", navigationContext);
}

function setupBackButton() {
  // Create back button if it doesn't exist
  let backBtn = document.getElementById("backButton");
  if (!backBtn) {
    backBtn = document.createElement("button");
    backBtn.id = "backButton";
    backBtn.className = "back-button";

    // Insert at the top of the page
    const headerElement = document.querySelector(".page-header");
    if (headerElement) {
      headerElement.insertBefore(backBtn, headerElement.firstChild);
    } else {
      const container = document.querySelector(".container") || document.body;
      container.insertBefore(backBtn, container.firstChild);
    }
  }

  // Configure back button based on context
  if (navigationContext.returnUrl) {
    backBtn.style.display = "flex";

    // Customize button text and behavior based on source
    switch (navigationContext.source) {
      case "student-dashboard":
        backBtn.innerHTML =
          '<i class="fas fa-arrow-left"></i> Back to Student Dashboard';
        backBtn.onclick = () =>
          (window.location.href = "student-dashboard.html");
        break;

      case "landlord-dashboard":
        backBtn.innerHTML =
          '<i class="fas fa-arrow-left"></i> Back to Landlord Dashboard';
        backBtn.onclick = () =>
          (window.location.href = "landlord-dashboard.html");
        break;

      case "property-details":
        backBtn.innerHTML =
          '<i class="fas fa-arrow-left"></i> Back to Property';
        backBtn.onclick = () => {
          if (navigationContext.returnUrl.startsWith("http")) {
            window.location.href = navigationContext.returnUrl;
          } else {
            window.history.back();
          }
        };
        break;

      case "profile":
        backBtn.innerHTML = '<i class="fas fa-arrow-left"></i> Back to Profile';
        backBtn.onclick = () => (window.location.href = "profile.html");
        break;

      case "search":
        backBtn.innerHTML = '<i class="fas fa-arrow-left"></i> Back to Search';
        backBtn.onclick = () => (window.location.href = "search.html");
        break;

      case "landlord-properties":
        backBtn.innerHTML =
          '<i class="fas fa-arrow-left"></i> Back to Properties';
        backBtn.onclick = () =>
          (window.location.href = "landlord-properties.html");
        break;

      default:
        backBtn.innerHTML = '<i class="fas fa-arrow-left"></i> Back';
        backBtn.onclick = () => {
          if (navigationContext.returnUrl) {
            window.location.href = navigationContext.returnUrl;
          } else {
            window.history.back();
          }
        };
    }
  } else {
    backBtn.style.display = "none";
  }
}

function waitForFirebaseAuth() {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        currentUser = user;
        resolve();
      } else {
        reject(new Error("User not authenticated"));
        window.location.href = "index.html";
      }
      unsubscribe();
    });
  });
}

async function loadUserProfile() {
  try {
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    if (userDoc.exists()) {
      userProfile = userDoc.data();
      updateUIWithUserInfo();
    } else {
      throw new Error("User profile not found");
    }
  } catch (error) {
    console.error("Error loading user profile:", error);
    showError("Failed to load user profile");
  }
}

function updateUIWithUserInfo() {
  // Update page elements with user info
  const userElements = document.querySelectorAll("[data-user-name]");
  userElements.forEach((el) => {
    el.textContent =
      userProfile?.firstName || currentUser.displayName || "User";
  });

  const roleElements = document.querySelectorAll("[data-user-role]");
  roleElements.forEach((el) => {
    el.textContent = userProfile?.role || "User";
  });
}

async function fetchMessages() {
  try {
    // Setup real-time listener for conversations
    const conversationsQuery = query(
      collection(db, "conversations"),
      where("participants", "array-contains", currentUser.uid),
      orderBy("lastMessageAt", "desc")
    );

    conversationsListener = onSnapshot(
      conversationsQuery,
      async (snapshot) => {
        await handleConversationsUpdate(snapshot);
      },
      (error) => {
        console.error("Error listening to conversations:", error);
        showError("Failed to load conversations");
      }
    );
  } catch (error) {
    console.error("Error setting up conversations listener:", error);
    showError("Failed to load messages");
  }
}

async function handleConversationsUpdate(snapshot) {
  conversations = [];

  for (const docSnapshot of snapshot.docs) {
    const conversationData = docSnapshot.data();

    // Get the other participant's info
    const otherParticipantId = conversationData.participants.find(
      (id) => id !== currentUser.uid
    );
    let otherUser = null;
    let propertyInfo = null;

    if (otherParticipantId) {
      try {
        // Get other participant's profile
        const userDoc = await getDoc(doc(db, "users", otherParticipantId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          otherUser = {
            _id: otherParticipantId,
            id: otherParticipantId,
            name: `${userData.firstName || ""} ${
              userData.lastName || ""
            }`.trim(),
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: userData.role,
            ...userData,
          };
        }

        // Get property info if available
        if (conversationData.propertyId) {
          const propertyDoc = await getDoc(
            doc(db, "properties", conversationData.propertyId)
          );
          if (propertyDoc.exists()) {
            propertyInfo = {
              id: conversationData.propertyId,
              ...propertyDoc.data(),
            };
          }
        }
      } catch (error) {
        console.error("Error fetching participant info:", error);
      }
    }

    // Count unread messages
    const unreadCount = await getUnreadMessageCount(docSnapshot.id);

    // Format conversation data to match your existing structure
    const formattedConversation = {
      id: docSnapshot.id,
      user: otherUser,
      lastMessage: {
        content: conversationData.lastMessage || "No messages yet",
        createdAt: conversationData.lastMessageAt?.toDate() || new Date(),
        property: conversationData.propertyId,
      },
      unreadCount: unreadCount,
      propertyInfo: propertyInfo,
      ...conversationData,
    };

    conversations.push(formattedConversation);
  }

  renderConversations(conversations);
  setupMessageListeners();
}

async function getUnreadMessageCount(conversationId) {
  try {
    const messagesQuery = query(
      collection(db, "conversations", conversationId, "messages"),
      where("senderId", "!=", currentUser.uid),
      where("read", "==", false)
    );

    const unreadMessages = await getDocs(messagesQuery);
    return unreadMessages.size;
  } catch (error) {
    console.error("Error counting unread messages:", error);
    return 0;
  }
}

function setupMessageListeners() {
  // Clear existing message listeners
  messageListeners.forEach((unsubscribe) => unsubscribe());
  messageListeners.clear();

  // Setup listeners for each conversation
  conversations.forEach((conversation) => {
    const messagesQuery = query(
      collection(db, "conversations", conversation.id, "messages"),
      orderBy("timestamp", "asc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      if (activeConversationId === conversation.id) {
        const messages = [];
        snapshot.forEach((doc) => {
          const messageData = doc.data();
          // Format to match your existing structure
          messages.push({
            id: doc.id,
            content: messageData.text,
            createdAt: messageData.timestamp?.toDate() || new Date(),
            sender: {
              _id: messageData.senderId,
              name: messageData.senderName,
            },
            receiver: {
              _id: conversation.user._id,
            },
            property: conversation.lastMessage.property,
            ...messageData,
          });
        });

        renderConversationMessages(
          messages,
          conversation.propertyInfo?.title || ""
        );
      }
    });

    messageListeners.set(conversation.id, unsubscribe);
  });
}

async function selectConversation(conversationId, conversationData) {
  activeConversationId = conversationId;

  document.getElementById("chatName").textContent =
    conversationData.user?.name || "User";
  document.getElementById("chatRole").textContent = conversationData.user?.role;

  document.getElementById("chatForm").style.display = "flex";

  document.querySelectorAll(".conversation-item").forEach((item) => {
    item.classList.remove("active");
  });
  const clickedItem = event.target.closest(".conversation-item");
  if (clickedItem) {
    clickedItem.classList.add("active");
  }
  await markMessagesAsRead(conversationId);
  const chatArea = document.getElementById('chatArea');
  if(chatArea){
    chatArea.innerHTML = '<div class="text-center py-8 text-gray-500">Loading messages</div>';
  }
}
function ensureMessagesContainer() {
  let container = document.getElementById("messagesContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "messagesContainer";
    document.body.appendChild(container);
  }
  return container;
}

function renderConversations(conversations) {
  const container = document.getElementById("conversationList");

  if(!container){
    console.error('Conversationlist element not found');
    return;
  }

  container.innerHTML = "";
  
  if (!conversations.length) {
    container.innerHTML = '<div class="text-gray-500 text-sm p-4">No conversations yet</div>';
    return;
  }

  conversations.forEach((conv) => {
    const div = document.createElement("div");
    div.className = "conversation-item p-3 rounded-lg cursor-pointer border border-gray-200 bg-white hover:bg-gray-50 mb-2";
    div.onclick = () => selectConversation(conv.id, conv);
    
    div.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
          <i class="fas fa-user text-green-600"></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-gray-800 truncate">${conv.user?.name || "User"}</div>
          <div class="text-sm text-gray-500 truncate">${conv.lastMessage.content}</div>
          <div class="text-xs text-gray-400">${new Date(conv.lastMessage.createdAt).toLocaleDateString()}</div>
        </div>
        ${conv.unreadCount ? `<div class="bg-green-600 text-white text-xs px-2 py-1 rounded-full">${conv.unreadCount}</div>` : ''}
      </div>
    `;
    container.appendChild(div);
    });
}

async function openConversation(userId, propertyId, propertyName) {
  try {
    // Find or create conversation
    let conversationId = await findOrCreateConversation(userId, propertyId);

    // Set as active conversation
    activeConversationId = conversationId;

    // Mark messages as read
    await markMessagesAsRead(conversationId);

    // Find the conversation data
    let conversationData = conversations.find(
      (conv) => conv.id === conversationId
    );

    if (!conversationData) {
      // If not found, create temporary data structure
      const userDoc = await getDoc(doc(db, "users", userId));
      const userData = userDoc.exists() ? userDoc.data() : {};

      conversationData = {
        id: conversationId,
        user: {
          _id: userId,
          name:
            `${userData.firstName || ""} ${userData.lastName || ""}`.trim() ||
            "User",
        },
        lastMessage: { property: propertyId },
        propertyInfo: { title: propertyName },
      };
    }

     document.getElementById("chatName").textContent =
      conversationData.user?.name || "User";
    document.getElementById("chatRole").textContent = conversationData.user?.role || "";

    document.getElementById("chatForm").style.display = "flex";

    // Show loading state in chat area
    const chatArea = document.getElementById('chatArea');
    if (chatArea) {
      chatArea.innerHTML = `
        <div class="conversation-header">
          <button class="back-to-conversations" onclick="showConversationsList()" style="margin-right: 1rem; padding: 0.5rem 1rem; background: #6b7280; color: white; border: none; border-radius: 0.375rem; cursor: pointer;">
            ← Back to Messages
          </button>
          <h3 style='color:#228b22;'>Conversation${propertyName ? " - " + propertyName : ""}</h3>
        </div>
        <div class="text-center py-8 text-gray-500">Loading messages...</div>
      `;
    }
  } catch (error) {
    console.error("Error opening conversation:", error);
    showError("Failed to open conversation");
  }
}

async function findOrCreateConversation(otherUserId, propertyId = null) {
  try {
    // Check if conversation already exists
    const conversationsQuery = query(
      collection(db, "conversations"),
      where("participants", "array-contains", currentUser.uid)
    );

    const existingConversations = await getDocs(conversationsQuery);

    for (const docSnapshot of existingConversations.docs) {
      const data = docSnapshot.data();
      const participants = data.participants;
      if (participants.includes(otherUserId)) {
        // If propertyId matches or no propertyId specified
        if (!propertyId || data.propertyId === propertyId) {
          return docSnapshot.id;
        }
      }
    }

    // Create new conversation
    const conversationRef = await addDoc(collection(db, "conversations"), {
      participants: [currentUser.uid, otherUserId],
      propertyId: propertyId || null,
      createdAt: serverTimestamp(),
      lastMessageAt: serverTimestamp(),
      lastMessage: "Conversation started",
      lastMessageSender: currentUser.uid,
      lastMessageRead: false,
    });

    return conversationRef.id;
  } catch (error) {
    console.error("Error finding/creating conversation:", error);
    throw error;
  }
}

function renderConversationMessages(messages, propertyName) {
  const chatArea = document.getElementById("chatArea");

  // Create conversation header with back button
  let headerHTML = `
    <div class="conversation-header">
      <button class="back-to-conversations" onclick="showConversationsList()" style="margin-right: 1rem; padding: 0.5rem 1rem; background: #6b7280; color: white; border: none; border-radius: 0.375rem; cursor: pointer;">
        ← Back to Messages
      </button>
      <h3 style='color:#228b22;'>Conversation${
        propertyName ? " - " + propertyName : ""
      }</h3>
    </div>
  `;

  // Ensure chatArea exists
  if (!chatArea) return;

  // Clear container and add header
  chatArea.innerHTML = headerHTML;

  if (!messages || !messages.length) {
    chatArea.innerHTML += '<div class="empty-state">No messages yet.</div>';
  } else {
    // Add messages
    messages.forEach((msg) => {
      const div = document.createElement("div");
      div.className = "message-item";
      div.innerHTML = `
        <div style="font-weight:600;color:${
          msg.senderId === currentUser.uid ? "#228b22" : "#222"
        }">${
        msg.senderId === currentUser.uid ? "You" : msg.senderName || "User"
      }</div>
        <div style="font-size:0.98rem;">${msg.text || msg.content}</div>
        <div style="font-size:0.9rem;color:#888;">${
          msg.timestamp
            ? new Date(
                msg.timestamp.seconds
                  ? msg.timestamp.seconds * 1000
                  : msg.timestamp
              ).toLocaleString()
            : ""
        }</div>
      `;
      chatArea.appendChild(div);
    });
  }

  }

  // Auto-scroll to bottom
  chatArea.scrollTop = chatArea.scrollHeight;

async function sendMessage(receiverId, propertyId, content) {
  try {
    if (!activeConversationId) {
      activeConversationId = await findOrCreateConversation(
        receiverId,
        propertyId
      );
    }

    await sendMessageToConversation(activeConversationId, content);
  } catch (error) {
    console.error("Error sending message:", error);
    alert("Failed to send message: " + error.message);
  }
}

async function sendMessageToConversation(conversationId, messageText) {
  if (!messageText.trim()) return;

  try {
    // Add message to conversation
    await addDoc(collection(db, "conversations", conversationId, "messages"), {
      senderId: currentUser.uid,
      senderName: userProfile?.firstName || currentUser.displayName || "User",
      text: messageText.trim(),
      timestamp: serverTimestamp(),
      read: false,
    });

    // Update conversation's last message
    await updateDoc(doc(db, "conversations", conversationId), {
      lastMessage: messageText.trim(),
      lastMessageAt: serverTimestamp(),
      lastMessageSender: currentUser.uid,
      lastMessageRead: false,
    });

    // Create notification for the other user
    const conversation = conversations.find(
      (conv) => conv.id === conversationId
    );
    if (conversation && conversation.user) {
      await addDoc(collection(db, "notifications"), {
        userId: conversation.user._id,
        title: "New Message",
        message: `New message from ${
          userProfile?.firstName || "User"
        }: ${messageText.substring(0, 50)}${
          messageText.length > 50 ? "..." : ""
        }`,
        type: "message",
        conversationId: conversationId,
        read: false,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
}

async function markMessagesAsRead(conversationId) {
  try {
    const messagesQuery = query(
      collection(db, "conversations", conversationId, "messages"),
      where("senderId", "!=", currentUser.uid),
      where("read", "==", false)
    );

    const unreadMessages = await getDocs(messagesQuery);

    const updatePromises = [];
    unreadMessages.forEach((doc) => {
      updatePromises.push(updateDoc(doc.ref, { read: true }));
    });

    await Promise.all(updatePromises);

    // Update conversation's last message read status
    const conversation = conversations.find(
      (conv) => conv.id === conversationId
    );
    if (
      conversation &&
      conversation.lastMessageSender !== currentUser.uid &&
      !conversation.lastMessageRead
    ) {
      await updateDoc(doc(db, "conversations", conversationId), {
        lastMessageRead: true,
      });
    }
  } catch (error) {
    console.error("Error marking messages as read:", error);
  }
}

function showConversationsList() {
  activeConversationId = null;
  renderConversations(conversations);
}

function handleContextualOpen() {
  // Handle opening from sessionStorage (from property pages, profiles, etc.)
  const landlordId = sessionStorage.getItem("messageLandlordId");
  const propertyId = sessionStorage.getItem("messagePropertyId");
  const propertyName = sessionStorage.getItem("messagePropertyName");

  // Check for additional context in sessionStorage
  const messageContext = sessionStorage.getItem("messageContext");
  if (messageContext) {
    const context = JSON.parse(messageContext);
    // Update navigation context if it wasn't detected from URL/referrer
    if (navigationContext.source === "direct") {
      navigationContext.source = context.source;
      navigationContext.returnUrl = context.returnUrl;
      setupBackButton(); // Re-setup with new context
    }
  }

  // Handle direct conversation opening
  if (landlordId && propertyId) {
    // Wait a bit for conversations to load
    setTimeout(() => {
      openConversation(landlordId, propertyId, propertyName);
      // Clear context after use but preserve navigation context
      sessionStorage.removeItem("messageLandlordId");
      sessionStorage.removeItem("messagePropertyId");
      sessionStorage.removeItem("messagePropertyName");
    }, 1500);
  }

  // Handle direct conversation opening from URL
  const urlParams = new URLSearchParams(window.location.search);
  const conversationId = urlParams.get("conversation");
  if (conversationId) {
    setTimeout(() => {
      const conversation = conversations.find(
        (conv) => conv.id === conversationId
      );
      if (conversation) {
        openConversation(
          conversation.user._id,
          conversation.lastMessage.property,
          conversation.propertyInfo?.title
        );
      }
    }, 1500);
  }

  // Handle opening specific landlord from URL
  const targetLandlordId = urlParams.get("landlord");
  const targetPropertyId = urlParams.get("property");
  if (targetLandlordId) {
    setTimeout(() => {
      openConversation(targetLandlordId, targetPropertyId, "");
    }, 1500);
  }
}

function showError(message) {
  console.error(message);
  const container = document.getElementById("messagesContainer");
  if (container) {
    container.innerHTML = `
      <div class="empty-state">
        <div style="color: #dc2626; font-weight: 600; margin-bottom: 1rem;">Error</div>
        <div>${message}</div>
        <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #228b22; color: white; border: none; border-radius: 0.375rem; cursor: pointer;">
          Retry
        </button>
      </div>
    `;
  }
}

// Cleanup function
function cleanup() {
  if (conversationsListener) {
    conversationsListener();
    conversationsListener = null;
  }

  messageListeners.forEach((unsubscribe) => unsubscribe());
  messageListeners.clear();
}

// Cleanup on page unload
window.addEventListener("beforeunload", cleanup);

// Make functions available globally for onclick handlers
window.openConversation = openConversation;
window.showConversationsList = showConversationsList;

// Helper functions for other pages to open messages with context
window.MessagesHelper = {
  // Open messages from student dashboard
  openFromStudentDashboard: () => {
    window.location.href = "messages.html?from=student-dashboard";
  },

  // Open messages from landlord dashboard
  openFromLandlordDashboard: () => {
    window.location.href = "messages.html?from=landlord-dashboard";
  },

  // Open specific conversation from property page
  openConversationFromProperty: (
    landlordId,
    propertyId,
    propertyName,
    returnUrl
  ) => {
    sessionStorage.setItem("messageLandlordId", landlordId);
    sessionStorage.setItem("messagePropertyId", propertyId);
    sessionStorage.setItem("messagePropertyName", propertyName || "");
    sessionStorage.setItem(
      "messageContext",
      JSON.stringify({
        source: "property-details",
        returnUrl: returnUrl || window.location.href,
      })
    );
    window.location.href = "messages.html?from=property-details";
  },

  // Open conversation from profile page
  openConversationFromProfile: (landlordId, returnUrl) => {
    sessionStorage.setItem("messageLandlordId", landlordId);
    sessionStorage.setItem(
      "messageContext",
      JSON.stringify({
        source: "profile",
        returnUrl: returnUrl || "profile.html",
      })
    );
    window.location.href = "messages.html?from=profile";
  },

  // Open with direct URL parameters
  openDirectConversation: (landlordId, propertyId, fromPage) => {
    const params = new URLSearchParams({
      landlord: landlordId,
      from: fromPage || "direct",
    });
    if (propertyId) params.set("property", propertyId);

    window.location.href = `messages.html?${params.toString()}`;
  },

  // Set message context for complex navigation scenarios
  setMessageContext: (source, returnUrl, additionalData = {}) => {
    sessionStorage.setItem(
      "messageContext",
      JSON.stringify({
        source,
        returnUrl,
        ...additionalData,
      })
    );
  },
};
