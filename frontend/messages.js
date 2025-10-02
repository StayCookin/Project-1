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

function formatTimestamp(timestamp) {
  // Replace the incomplete implementation with a robust formatter
  if (!timestamp) return new Date();
  // Firestore Timestamp object
  if (typeof timestamp.toDate === "function") return timestamp.toDate();
  // plain object with seconds (e.g. serialized)
  if (typeof timestamp.seconds === "number")
    return new Date(timestamp.seconds * 1000);
  // numeric millis
  if (typeof timestamp === "number") return new Date(timestamp);
  // fallback: attempt Date conversion
  return new Date(timestamp);
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
        const messageText = (
          chatInputEl && chatInputEl.value ? chatInputEl.value : ""
        ).trim();
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
  } else if (urlParams.get("from") === "marketplace") {
    navigationContext.source = "marketplace";
    navigationContext.returnUrl = "marketplace.html";
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
  console.error(" Error counting unread messages:", error);
  return 0;
}
}

function setupMessageListeners() {
  messageListeners.forEach((unsubscribe) => unsubscribe ());
  messageListeners.clear();

  conversations.forEach((conversation) => {
    const messagesQuery = query(
      collection(db, "conversations", conversation.id, "messages"),
      orderBy("timestamp", "asc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      if(activeConversationId === conversation.id) {
        const messages = [];
        snapshot.forEach((doc) => {
          const messageData = doc.data();
          messages.push({
            id: doc.id,
            content: messageData.text,
            sender: {
              _id: messageData.senderId,
              name: messageData.senderName,
            },
            receiver: {
              _id: conversation.user?._id || conversation.user?.id || null,
            },
            property:
            conversation.lastMessage?.property || 
            conversation.propertyInfo?.id || null,
            ...messageData,
          });
        });
        renderConversationMessages(messages, conversation.propertyInfo?.title || "");
      }
    });
    messageListeners.set(conversation.id, unsubscribe);
  })
}

function renderConversations(conversations) {
  const container = document.getElementById("conversationList");

  if(!container) {
    console.error("Conversation list element not found");
    return;
  }
  container.innerHTML = "";

  if(!conversations.length) {
    container.innerHTML = 
    '<div class="text-gray-500 text-sm p-4">No conversations yet</div>';
    return;
  }

  const renderedIds = new Set();

  conversations.forEach((conv) => {
    if (renderedIds.has(conv.id)) {
      console.warn(`Skipping duplicate render for conversation: ${conv.id}`);
      return;
    }
    renderedIds.add(conv.id);

    const div = document.createElement("div");
    div.className = 
    "conversation-item p-3 rounded-lg cursor-pointer border border-gray-200 bg-white hover:bg-gray-50 mb-2";
    div.setAttribute("data-conversation-id", conv.id);

    if (activeConversationId === conv.id) {
      div.classList.add("active");
    }

    div.onclick = () => selectConversation(conv.id, conv);
 let displayName = "User";
    let roleDisplay = "";

    if (conv.user) {
      if (conv.user.name && conv.user.name !== "User") {
        displayName = conv.user.name;
      } else if (conv.user.firstName || conv.user.lastName) {
        displayName = `${conv.user.firstName || ""} ${
          conv.user.lastName || ""
        }`.trim();
      } else if (conv.user.email) {
        displayName = conv.user.email.split("@")[0];
      }

      roleDisplay = conv.user.role ? ` • ${conv.user.role}` : "";
    }

    div.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
          ${
            conv.user?.profileImage
              ? `<img src="${conv.user.profileImage}" alt="${displayName}" class="w-full h-full rounded-full object-cover" />`
              : `<i class="fas fa-user text-green-600"></i>`
          }
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-gray-800 truncate">${displayName}${roleDisplay}</div>
          <div class="text-sm text-gray-500 truncate">${
            conv.lastMessage.content || "No messages yet"
          }</div>
          <div class="text-xs text-gray-400">${
            conv.lastMessage.createdAt
              ? new Date(conv.lastMessage.createdAt).toLocaleDateString()
              : ""
          }</div>
        </div>
        ${
          conv.unreadCount
            ? `<div class="bg-green-600 text-white text-xs px-2 py-1 rounded-full">${conv.unreadCount}</div>`
            : ""
        }
      </div>
    `;
    container.appendChild(div);
  });
}

async function selectConversation(conversationId, conversationData) {
  activeConversationId = conversationId;

  document.getElementById("chatName").textContent =
    conversationData.user?.name || "User";
  document.getElementById("chatRole").textContent =
    conversationData.user?.role || "";

  document.getElementById("chatForm").style.display = "flex";

  // Update active state on all conversation items
  document.querySelectorAll(".conversation-item").forEach((item) => {
    item.classList.remove("active");
    if (item.getAttribute("data-conversation-id") === conversationId) {
      item.classList.add("active");
    }
  });

  await markMessagesAsRead(conversationId);

  const chatArea = document.getElementById("chatArea");
  if (chatArea) {
    chatArea.innerHTML =
      '<div class="text-center py-8 text-gray-500">Loading messages...</div>';
  }
}

function renderConversationMessages(messages, propertyName) {
  const chatArea = document.getElementById("chatArea");

  if (!chatArea) return;

  // Clear container
  chatArea.innerHTML = "";

  if (!messages || !messages.length) {
    chatArea.innerHTML = '<div class="text-center py-8 text-gray-500">No messages yet.</div>';
  } else {
    // Add messages
    messages.forEach((msg) => {
      const div = document.createElement("div");
      const isCurrentUser = msg.senderId === currentUser.uid;
      
      div.className = `chat-bubble ${isCurrentUser ? 'student' : 'landlord'}`;
      
      div.innerHTML = `
        <div style="font-size:0.98rem;">${msg.text || msg.content}</div>
        <div style="font-size:0.75rem;color:#666;margin-top:4px;">${
          msg.timestamp
            ? formatTimestamp(msg.timestamp).toLocaleTimeString()
            : formatTimestamp(msg.createdAt).toLocaleTimeString()
        }</div>
      `;
      chatArea.appendChild(div);
    });
  }

  // Auto-scroll to bottom
  chatArea.scrollTop = chatArea.scrollHeight;
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
        console.log('Using existing conversation: ${docSnapshot.id}');
        return docSnapshot.id;
        }
      }
      
    }catch (error) { console.error(" error finding conversations:", error);}

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
  } 
  async function cleanupDuplicateConversations() {
  console.log("🧹 Cleaning up duplicate conversations...");
  
  try {
    const conversationsQuery = query(
      collection(db, "conversations"),
      where("participants", "array-contains", currentUser.uid)
    );

    const snapshot = await getDocs(conversationsQuery);
    const conversationsByUser = new Map();

    // Group conversations by other participant
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const otherUserId = data.participants.find(id => id !== currentUser.uid);
      
      if (!conversationsByUser.has(otherUserId)) {
        conversationsByUser.set(otherUserId, []);
      }
      conversationsByUser.get(otherUserId).push({ id: doc.id, data });
    });

    // Find and handle duplicates
    for (const [userId, convs] of conversationsByUser.entries()) {
      if (convs.length > 1) {
        console.log(`Found ${convs.length} conversations with user ${userId}`);
        
        // Keep the oldest conversation, delete others
        convs.sort((a, b) => {
          const aTime = a.data.createdAt?.toMillis() || 0;
          const bTime = b.data.createdAt?.toMillis() || 0;
          return aTime - bTime;
        });

        const keepConv = convs[0];
        const deleteConvs = convs.slice(1);

        console.log(`Keeping conversation: ${keepConv.id}`);
        
        for (const conv of deleteConvs) {
          console.log(`Would delete conversation: ${conv.id}`);
          // Uncomment to actually delete:
          // await deleteDoc(doc(db, "conversations", conv.id));
        }
      }
    }

    console.log("✅ Cleanup complete");
  } catch (error) {
    console.error("Cleanup failed:", error);
  }
}

// Make it available globally
window.cleanupDuplicateConversations = cleanupDuplicateConversations;

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
    document.getElementById("chatRole").textContent =
      conversationData.user?.role || "";

    document.getElementById("chatForm").style.display = "flex";

    // Show loading state in chat area
    const chatArea = document.getElementById("chatArea");
    if (chatArea) {
      chatArea.innerHTML =
        '<div class="text-center py-8 text-gray-500">Loading messages...</div>';
    }
  } catch (error) {
    console.error("Error opening conversation:", error);
    showError("Failed to open conversation");
  }
}

function handleContextualOpen() {
  // Handle opening from sessionStorage
  const landlordId = sessionStorage.getItem("messageLandlordId");
  const propertyId = sessionStorage.getItem("messagePropertyId");
  const propertyName = sessionStorage.getItem("messagePropertyName");

  const messageContext = sessionStorage.getItem("messageContext");
  if (messageContext) {
    const context = JSON.parse(messageContext);
    if (navigationContext.source === "direct") {
      navigationContext.source = context.source;
      navigationContext.returnUrl = context.returnUrl;
      setupBackButton();
    }
  }

  if (landlordId && propertyId) {
    setTimeout(() => {
      openConversation(landlordId, propertyId, propertyName);
      sessionStorage.removeItem("messageLandlordId");
      sessionStorage.removeItem("messagePropertyId");
      sessionStorage.removeItem("messagePropertyName");
    }, 1500);
  }

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
  const chatArea = document.getElementById("chatArea");
  if (chatArea) {
    chatArea.innerHTML = `
      <div class="text-center py-8">
        <div style="color: #dc2626; font-weight: 600; margin-bottom: 1rem;">Error</div>
        <div class="text-gray-600">${message}</div>
        <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
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

window.openConversation = openConversation;
window.diagnoseLandlordData = diagnoseLandlordData;

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

// Add rendering guard and debounce helper
let isRendering = false;

function debounce(fn, wait = 150) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), wait);
    };
}

// Lightweight debounced renderer (uses your existing renderConversations)
const debouncedRenderConversations = debounce((convs) => {
    try {
        renderConversations(convs);
    } catch (err) {
        console.error("Debounced render failed:", err);
    }
}, 150);

// Replace or add enhanced handleConversationsUpdate
async function handleConversationsUpdate(snapshot) {
  if (isRendering) {
    console.log("Already processing conversation update, queuing...");
    setTimeout(() => handleConversationsUpdate(snapshot), 200);
    return;
  }

  isRendering = true;

  try {
    const newConversations = [];
    const processedIds = new Set();

    for (const docSnapshot of snapshot.docs) {
      const conversationId = docSnapshot.id;

      if (processedIds.has(conversationId)) {
        console.log(`Skipping duplicate conversation: ${conversationId}`);
        continue;
      }
      processedIds.add(conversationId);

      const conversationData = docSnapshot.data();

      // Get the other participant's id
      const otherParticipantId = (conversationData.participants || []).find(
        (id) => id !== currentUser.uid
      );

      let otherUser = null;
      let propertyInfo = null;

      // ENHANCED USER PROFILE LOADING
      if (otherParticipantId) {
        try {
          console.log(`Loading profile for participant: ${otherParticipantId}`);

          const otherUserDoc = await getDoc(doc(db, "users", otherParticipantId));

          if (otherUserDoc.exists()) {
            const userData = otherUserDoc.data();

            // Multiple fallback strategies for getting the name
            let displayName = "User";
            const firstName = userData.firstName || "";
            const lastName = userData.lastName || "";
            const constructedName = `${firstName} ${lastName}`.trim();

            if (constructedName) {
              displayName = constructedName;
            } else if (userData.fullName) {
              displayName = userData.fullName;
            } else if (userData.name && userData.name !== "User") {
              displayName = userData.name;
            } else if (userData.displayName) {
              displayName = userData.displayName;
            } else if (userData.email) {
              displayName = userData.email.split("@")[0];
            } else if (userData.businessName) {
              displayName = userData.businessName;
            } else if (userData.companyName) {
              displayName = userData.companyName;
            }

            otherUser = {
              _id: otherParticipantId,
              id: otherParticipantId,
              name: displayName,
              firstName: userData.firstName || "",
              lastName: userData.lastName || "",
              fullName: userData.fullName || displayName,
              role: userData.role || "User",
              email: userData.email || "",
              profileImage: userData.profileImage || userData.photoURL || null,
              businessName: userData.businessName || null,
              companyName: userData.companyName || null,
              ...userData,
            };
          } else {
            console.warn(`❌ User document NOT FOUND for ID: ${otherParticipantId}`);

            let fallbackName = "User";
            if (conversationData.participantNames && conversationData.participantNames[otherParticipantId]) {
              fallbackName = conversationData.participantNames[otherParticipantId];
            }

            otherUser = {
              _id: otherParticipantId,
              id: otherParticipantId,
              name: fallbackName,
              role: "User",
              error: "Profile not found"
            };
          }
        } catch (err) {
          console.error(`❌ ERROR loading participant profile (${otherParticipantId}):`, err);

          otherUser = {
            _id: otherParticipantId,
            id: otherParticipantId,
            name: "User (Error Loading)",
            role: "User",
            error: err.message
          };
        }
      } else {
        console.error("❌ No other participant ID found in conversation", docSnapshot.id);
      }

      // Get property info if available
      if (conversationData.propertyId) {
        try {
          const propertyDoc = await getDoc(
            doc(db, "properties", conversationData.propertyId)
          );
          if (propertyDoc.exists()) {
            propertyInfo = {
              id: conversationData.propertyId,
              ...propertyDoc.data(),
            };
          }
        } catch (err) {
          console.error("Failed to load property info:", err);
        }
      }

      // Count unread messages
      const unreadCount = await getUnreadMessageCount(docSnapshot.id);

      // Format conversation data
      const formattedConversation = {
        id: docSnapshot.id,
        user: otherUser,
        lastMessage: {
          content: conversationData.lastMessage || "No messages yet",
          createdAt: formatTimestamp(conversationData.lastMessageAt),
          property: conversationData.propertyId || null,
        },
        unreadCount: unreadCount,
        propertyInfo: propertyInfo,
        participants: conversationData.participants,
        ...conversationData,
      };

      newConversations.push(formattedConversation);
    } // end for

    conversations = newConversations;

    console.log(`✅ Processed ${conversations.length} conversations`);
    console.log(
      "Conversation summary:",
      conversations.map((c) => ({
        id: c.id,
        otherUser: c.user?.name,
        role: c.user?.role,
      }))
    );

    debouncedRenderConversations(conversations);

    if (messageListeners.size === 0 || messageListeners.size !== conversations.length) {
      setupMessageListeners();
    }
  } finally {
    isRendering = false;
  }
}

// DIAGNOSTIC FUNCTION - Call this to check what data exists in Firestore
async function diagnoseLandlordData() {
  console.log("=== DIAGNOSTIC: Checking Landlord Data ===");

  try {
    const conversationsQuery = query(
      collection(db, "conversations"),
      where("participants", "array-contains", currentUser.uid)
    );

    const convSnapshot = await getDocs(conversationsQuery);

    console.log(`Found ${convSnapshot.size} conversations`);

    for (const convDoc of convSnapshot.docs) {
      const convData = convDoc.data();
      const otherParticipantId = convData.participants.find(
        (id) => id !== currentUser.uid
      );

      console.log(`\n--- Conversation ${convDoc.id} ---`);
      console.log("Other participant ID:", otherParticipantId);

      if (otherParticipantId) {
        try {
          const userDoc = await getDoc(doc(db, "users", otherParticipantId));

          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log("✅ User document EXISTS");
            console.log("Available fields:", Object.keys(userData));
            console.log("firstName:", userData.firstName);
            console.log("lastName:", userData.lastName);
            console.log("fullName:", userData.fullName);
            console.log("name:", userData.name);
            console.log("email:", userData.email);
            console.log("role:", userData.role);
            console.log("businessName:", userData.businessName);
            console.log("All data:", userData);
          } else {
            console.log("❌ User document DOES NOT EXIST");
          }
        } catch (err) {
          console.error("❌ Error fetching user:", err);
        }
      }
    }

    console.log("\n=== END DIAGNOSTIC ===");
  } catch (err) {
    console.error("Diagnostic failed:", err);
  }
}

// Make diagnostic available globally
window.diagnoseLandlordData = diagnoseLandlordData;

// AUTO-RUN DIAGNOSTIC on page load (remove this after debugging)
setTimeout(() => {
  console.log("🔍 Running automatic diagnostic...");
  if (currentUser) diagnoseLandlordData().catch(err => console.error('Diagnostic failed', err));
}, 3000);

// ...existing code...
