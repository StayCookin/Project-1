document.addEventListener("DOMContentLoaded", function () {
  fetchSavedProperties();
});

async function fetchSavedProperties() {
  try {
    const res = await fetch("/api/properties/saved");
    if (!res.ok) throw new Error("Failed to fetch saved properties");
    const properties = await res.json();
    renderSavedProperties(properties);
  } catch (err) {
    document.getElementById("savedPropertiesGrid").innerHTML =
      '<div class="empty-state">Failed to load saved properties.</div>';
  }
}

function renderSavedProperties(properties) {
  const grid = document.getElementById("savedPropertiesGrid");
  grid.innerHTML = "";
  if (!properties.length) {
    grid.innerHTML =
      '<div class="empty-state">No saved properties found.</div>';
    return;
  }
  properties.forEach((property) => {
    const card = document.createElement("div");
    card.className = "property-card";
    card.innerHTML = `
      <img src="${property.imageUrl || "/img/default-property.jpg"}" alt="${
      property.title
    }" class="property-image" />
      <div class="property-details">
        <div class="property-price">P${property.price}/month</div>
        <h3 class="property-title">${property.title}</h3>
        <p class="property-location">${property.location}</p>
        <div class="property-features">
          <span><i class="fas fa-bed"></i> ${property.beds} Beds</span>
          <span><i class="fas fa-bath"></i> ${property.baths} Bath${
      property.baths > 1 ? "s" : ""
    }</span>
          <span><i class="fas fa-ruler-combined"></i> ${
            property.size
          } sqft</span>
        </div>
        <div class="property-actions">
          <button class="btn btn-primary" onclick="viewDetails('${
            property._id
          }')"><i class="fas fa-eye"></i> View Details</button>
          <button class="btn btn-secondary" onclick="removeSavedProperty('${
            property._id
          }')"><i class="fas fa-heart"></i> Remove</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

function viewDetails(propertyId) {
  window.location.href = `/property-details.html?id=${propertyId}`;
}

function removeSavedProperty(propertyId) {
  fetch(`/api/properties/${propertyId}/unsave`, { method: "POST" }).then(
    (res) =>
      res.ok ? fetchSavedProperties() : alert("Failed to remove property.")
  );
}
