// js/messages.js
// Handles dynamic data population for the messages page

document.addEventListener("DOMContentLoaded", () => {
  fetchMessages();
  // If context is set (from profile), open that conversation
  const landlordId = sessionStorage.getItem("messageLandlordId");
  const propertyId = sessionStorage.getItem("messagePropertyId");
  const propertyName = sessionStorage.getItem("messagePropertyName");
  if (landlordId && propertyId) {
    openConversation(landlordId, propertyId, propertyName);
    // Optionally clear context after use
    // sessionStorage.removeItem('messageLandlordId');
    // sessionStorage.removeItem('messagePropertyId');
    // sessionStorage.removeItem('messagePropertyName');
  }
});

async function fetchMessages() {
  try {
    const res = await fetch("/api/messages/conversations");
    if (!res.ok) throw new Error("Failed to fetch conversations");
    const conversations = await res.json();
    renderConversations(conversations);
  } catch (err) {
    document.getElementById("messagesContainer").innerHTML =
      '<div class="empty-state">Failed to load messages.</div>';
  }
}

function renderConversations(conversations) {
  const container = document.getElementById("messagesContainer");
  container.innerHTML = "";
  if (!conversations.length) {
    container.innerHTML = '<div class="empty-state">No messages found.</div>';
    return;
  }
  conversations.forEach((conv) => {
    const div = document.createElement("div");
    div.className = "message-thread";
    div.innerHTML = `
      <div class="message-header">
        <span class="sender">${conv.user?.name || "User"}</span>
        <span class="date">${new Date(
          conv.lastMessage.createdAt
        ).toLocaleString()}</span>
        <span class="unread-count" style="color:#228b22;font-weight:600;">${
          conv.unreadCount ? conv.unreadCount + " unread" : ""
        }</span>
      </div>
      <div class="message-body">${conv.lastMessage.content}</div>
      <button class="btn" style="margin-top:0.5rem;" onclick="openConversation('${
        conv.user._id
      }','${conv.lastMessage.property}','')">Open Conversation</button>
    `;
    container.appendChild(div);
  });
}

async function openConversation(userId, propertyId, propertyName) {
  // Fetch messages for this conversation
  try {
    const res = await fetch(`/api/messages/${propertyId}/${userId}`);
    if (!res.ok) throw new Error("Failed to fetch conversation");
    const messages = await res.json();
    renderConversationMessages(messages, propertyName);
  } catch (err) {
    document.getElementById("messagesContainer").innerHTML =
      '<div class="empty-state">Failed to load conversation.</div>';
  }
}

function renderConversationMessages(messages, propertyName) {
  const container = document.getElementById("messagesContainer");
  container.innerHTML = `<h3 style='color:#228b22;'>Conversation${
    propertyName ? " - " + propertyName : ""
  }</h3>`;
  if (!messages.length) {
    container.innerHTML += '<div class="empty-state">No messages yet.</div>';
    return;
  }
  messages.forEach((msg) => {
    const div = document.createElement("div");
    div.className = "message-item";
    div.innerHTML = `
      <div style="font-weight:600;color:${
        msg.sender?._id === msg.receiver?._id ? "#228b22" : "#222"
      };">${msg.sender?.name || "User"}</div>
      <div style="font-size:0.98rem;">${msg.content}</div>
      <div style="font-size:0.9rem;color:#888;">${new Date(
        msg.createdAt
      ).toLocaleString()}</div>
    `;
    container.appendChild(div);
  });
  // Add message form
  container.innerHTML += `
    <form id="sendMessageForm" style="margin-top:1.2rem;display:flex;gap:0.5rem;">
      <input type="text" id="messageInput" placeholder="Type your message..." style="flex:1;padding:0.6rem 1rem;border:1px solid #228b22;border-radius:5px;" required />
      <button class="btn" type="submit">Send</button>
    </form>
  `;
  document.getElementById("sendMessageForm").onsubmit = function (e) {
    e.preventDefault();
    sendMessage(
      messages[0].receiver._id,
      messages[0].property,
      document.getElementById("messageInput").value
    );
  };
}

async function sendMessage(receiverId, propertyId, content) {
  try {
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receiverId, propertyId, content }),
    });
    if (!res.ok) throw new Error("Failed to send message");
    // Refresh conversation
    openConversation(receiverId, propertyId);
  } catch (err) {
    alert("Failed to send message: " + err.message);
  }
}
