// js/messages.js
// Handles dynamic data population for the messages page

document.addEventListener("DOMContentLoaded", () => {
  fetchMessages();
});

async function fetchMessages() {
  try {
    const res = await fetch("/api/messages");
    if (!res.ok) throw new Error("Failed to fetch messages");
    const messages = await res.json();
    renderMessages(messages);
  } catch (err) {
    document.getElementById("messagesContainer").innerHTML =
      '<div class="empty-state">Failed to load messages.</div>';
  }
}

function renderMessages(messages) {
  const container = document.getElementById("messagesContainer");
  container.innerHTML = "";
  if (!messages.length) {
    container.innerHTML = '<div class="empty-state">No messages found.</div>';
    return;
  }
  // Example rendering, adjust as needed for your backend structure
  messages.forEach((msg) => {
    const msgDiv = document.createElement("div");
    msgDiv.className = "message-thread";
    msgDiv.innerHTML = `
      <div class="message-header">
        <span class="sender">${msg.senderName}</span>
        <span class="date">${msg.date}</span>
      </div>
      <div class="message-body">${msg.body}</div>
    `;
    container.appendChild(msgDiv);
  });
}
