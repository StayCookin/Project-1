function saveProperty(propertyId) {
  fetch("/api/saved-properties", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ propertyId }),
  })
    .then((res) => {
      if (!res.ok) throw new Error("Failed to save property");
      // Optionally update UI (e.g., show saved state)
      alert("Property saved!");
    })
    .catch(() => alert("Could not save property."));
}

// Example usage: add a save button to property cards in marketplace.html
// <button onclick="saveProperty('PROPERTY_ID')">Save</button>
