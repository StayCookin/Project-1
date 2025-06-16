// js/settings.js
// Handles account settings update for the settings page

document.addEventListener("DOMContentLoaded", () => {
  fetchUserSettings();
  document
    .getElementById("settingsForm")
    .addEventListener("submit", async function (e) {
      e.preventDefault();
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      try {
        const res = await fetch("/api/profile/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) throw new Error("Failed to update settings");
        document.getElementById("settingsFormSuccess").textContent =
          "Settings updated!";
        this.reset();
      } catch (err) {
        alert("Failed to update settings: " + err.message);
      }
    });
});

async function fetchUserSettings() {
  try {
    const res = await fetch("/api/profile");
    if (!res.ok) throw new Error("Failed to fetch user settings");
    const profile = await res.json();
    document.getElementById("email").value = profile.email || "";
  } catch (err) {
    // Optionally show error
  }
}
