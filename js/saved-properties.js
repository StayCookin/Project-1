async function fetchSavedProperties() {
  try {
    const res = await fetch("/api/saved-properties", {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to fetch saved properties");
    const data = await res.json();
    return data.map((item) => ({
      id: item._id,
      property: item.property.title,
      location: item.property.location,
      price: item.property.price,
      image:
        (item.property.images && item.property.images[0]) ||
        "https://placehold.co/400x180/eee/222?text=No+Image",
      propertyId: item.property._id,
    }));
  } catch (err) {
    return [];
  }
}

function renderSavedProperties() {
  fetchSavedProperties().then((properties) => {
    const grid = document.getElementById("savedPropertiesGrid");
    if (!properties.length) {
      grid.innerHTML =
        '<div style="color:#888;text-align:center;">No saved properties yet.</div>';
      return;
    }
    grid.innerHTML = properties
      .map(
        (p) => `
      <div class="property-card">
        <img class="property-image" src="${p.image}" alt="Property" />
        <div class="property-info">
          <div class="property-title">${p.property}</div>
          <div class="property-location"><i class="fas fa-map-marker-alt"></i> ${
            p.location
          }</div>
          <div class="property-price">P${
            p.price ? p.price.toLocaleString() : "-"
          }</div>
          <div class="property-action">
            <button class="btn" onclick="window.location.href='property-details.html?id=${
              p.propertyId
            }'">View Details</button>
            <button class="btn" style="background:#fff;color:#b00;border:1.5px solid #b00;margin-left:0.5rem;" onclick="deleteSavedProperty('${
              p.id
            }')"><i class='fas fa-trash'></i> Remove</button>
          </div>
        </div>
      </div>
    `
      )
      .join("");
  });
}

function deleteSavedProperty(id) {
  fetch(`/api/saved-properties/${id}`, {
    method: "DELETE",
    credentials: "include",
  })
    .then(() => renderSavedProperties())
    .catch(() => renderSavedProperties());
}

document.addEventListener("DOMContentLoaded", renderSavedProperties);
