// js/user-profile.js
// Handles dynamic data population for the user profile page

document.addEventListener("DOMContentLoaded", () => {
  fetchUserProfile();
  setupImageUpload();
});

async function fetchUserProfile() {
  try {
    const res = await fetch("/api/profile");
    if (!res.ok) throw new Error("Failed to fetch profile");
    const profile = await res.json();
    document.getElementById("profileImage").src =
      profile.photoUrl || "/img/default-profile.png";
    // Optionally populate more profile fields here
  } catch (err) {
    console.error("Profile fetch error:", err);
  }
}

function setupImageUpload() {
  const input = document.getElementById("imageUpload");
  input.addEventListener("change", async function (event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size should be less than 5MB");
      return;
    }
    const formData = new FormData();
    formData.append("photo", file);
    try {
      const res = await fetch("/api/profile/photo", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to upload image");
      const data = await res.json();
      document.getElementById("profileImage").src = data.photoUrl;
      alert("Profile photo updated!");
    } catch (err) {
      alert("Failed to upload image: " + err.message);
    }
  });
}
