document.addEventListener("DOMContentLoaded", function () {
  // Check if user is authenticated
  const studentData = JSON.parse(localStorage.getItem("studentData"));
  if (!studentData || studentData.role !== "student") {
    // Redirect to landing page if not authenticated
    window.location.href = "index.html";
    return;
  }

  // Get property data from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const propertyTitle = urlParams.get("title");
  const propertyId = urlParams.get("id");

  // Load property data
  loadPropertyData(propertyId, propertyTitle);

  // Handle image gallery
  const mainImage = document.querySelector(".main-image");
  const thumbnails = document.querySelectorAll(".thumbnail");

  thumbnails.forEach((thumbnail) => {
    thumbnail.addEventListener("click", function () {
      const tempSrc = mainImage.src;
      mainImage.src = this.src;
      this.src = tempSrc;
    });
  });

  // Handle contact form submission
  const contactForm = document.querySelector(".contact-form");
  contactForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    const formData = {
      message: this.querySelector("textarea").value,
      propertyId: propertyId,
    };

    // Send inquiry to backend
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("You must be logged in to send an inquiry.");
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send inquiry.");
      }
      alert("Inquiry sent successfully! The landlord will respond soon.");
      this.reset();
    } catch (err) {
      alert("Failed to send inquiry: " + err.message);
    }
  });

  // Handle viewing request form submission
  const viewingForm = document.querySelector(".contact-form:last-of-type");
  viewingForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const formData = {
      date: this.querySelector('input[type="date"]').value,
      time: this.querySelector("select").value,
      propertyId: propertyId,
      propertyTitle: propertyTitle,
      studentId: studentData.id,
      studentName: studentData.name,
    };

    // Store viewing request in localStorage for demo purposes
    const viewings = JSON.parse(
      localStorage.getItem("viewingRequests") || "[]"
    );
    viewings.push({
      ...formData,
      timestamp: new Date().toISOString(),
      status: "pending",
    });
    localStorage.setItem("viewingRequests", JSON.stringify(viewings));

    alert("Viewing request submitted successfully!");
    this.reset();
  });

  // Handle similar property card clicks
  const propertyCards = document.querySelectorAll(".property-card");
  propertyCards.forEach((card) => {
    card.addEventListener("click", function () {
      const title = this.querySelector(".property-card-title").textContent;
      window.location.href = `property-details.html?title=${encodeURIComponent(
        title
      )}`;
    });
  });
});

function loadPropertyData(propertyId, propertyTitle) {
  // For demo purposes, we'll use hardcoded data
  // In a real application, this would fetch data from a server
  const properties = {
    "Modern Apartment near UB": {
      title: "Modern Apartment near UB Campus",
      location: "Gaborone, Near UB Campus",
      price: "P3,500/month",
      features: {
        bedrooms: 2,
        bathrooms: 1,
        area: "800 sqft",
        type: "Apartment",
        floor: "2nd floor",
      },
      description:
        "This modern apartment is located in a prime area near UB Campus. It features a spacious living room, modern kitchen, and two well-appointed bedrooms. The property is fully furnished and includes all necessary amenities for comfortable living.",
      amenities: [
        "WiFi",
        "Parking",
        "Security",
        "Laundry",
        "Air Conditioning",
        "TV",
      ],
      images: [
        "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      ],
    },
    "Cozy Studio near Baisago": {
      title: "Cozy Studio near Baisago",
      location: "Gaborone, Near Baisago Campus",
      price: "P2,800/month",
      features: {
        bedrooms: 1,
        bathrooms: 1,
        area: "500 sqft",
        type: "Studio",
        floor: "1st floor",
      },
      description:
        "A cozy studio apartment perfect for students. Located near Baisago Campus, this property offers convenience and comfort in a compact space.",
      amenities: ["WiFi", "Parking", "Security", "Laundry"],
      images: [
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      ],
    },
    "Luxury Apartment near Botho": {
      title: "Luxury Apartment near Botho",
      location: "Gaborone, Near Botho Campus",
      price: "P4,200/month",
      features: {
        bedrooms: 3,
        bathrooms: 2,
        area: "1200 sqft",
        type: "Apartment",
        floor: "3rd floor",
      },
      description:
        "A luxurious apartment with modern amenities and spacious rooms. Perfect for students looking for premium accommodation near Botho Campus.",
      amenities: [
        "WiFi",
        "Parking",
        "Security",
        "Laundry",
        "Air Conditioning",
        "TV",
        "Gym",
      ],
      images: [
        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      ],
    },
  };

  const property = properties[propertyTitle];
  if (property) {
    // Update page content with property data
    document.querySelector(".property-title").textContent = property.title;
    document.querySelector(
      ".property-location"
    ).innerHTML = `<i class="fas fa-map-marker-alt"></i> ${property.location}`;
    document.querySelector(".property-price").textContent = property.price;

    // Update images
    const mainImage = document.querySelector(".main-image");
    const thumbnails = document.querySelectorAll(".thumbnail");
    mainImage.src = property.images[0];
    thumbnails[0].src = property.images[1];
    thumbnails[1].src = property.images[2];

    // Update features
    const featuresGrid = document.querySelector(".features-grid");
    featuresGrid.innerHTML = `
                    <div class="feature-item">
                        <i class="fas fa-bed feature-icon"></i>
                        <div>
                            <h3>${property.features.bedrooms} Bedrooms</h3>
                            <p>Spacious master bedroom</p>
                        </div>
                    </div>
                    <div class="feature-item">
                        <i class="fas fa-bath feature-icon"></i>
                        <div>
                            <h3>${property.features.bathrooms} Bathroom</h3>
                            <p>Modern fixtures</p>
                        </div>
                    </div>
                    <div class="feature-item">
                        <i class="fas fa-ruler-combined feature-icon"></i>
                        <div>
                            <h3>${property.features.area}</h3>
                            <p>Total living area</p>
                        </div>
                    </div>
                    <div class="feature-item">
                        <i class="fas fa-building feature-icon"></i>
                        <div>
                            <h3>${property.features.type}</h3>
                            <p>${property.features.floor}</p>
                        </div>
                    </div>
                `;

    // Update description
    document.querySelector(".details-section p").textContent =
      property.description;

    // Update amenities
    const amenitiesList = document.querySelector(".amenities-list");
    amenitiesList.innerHTML = property.amenities
      .map(
        (amenity) => `
                    <div class="amenity-item">
                        <i class="fas fa-${getAmenityIcon(
                          amenity
                        )} amenity-icon"></i>
                        <span>${amenity}</span>
                    </div>
                `
      )
      .join("");

    // Update similar properties
    const similarProperties = Object.entries(properties)
      .filter(([title]) => title !== propertyTitle)
      .slice(0, 2);

    const similarPropertiesGrid = document.querySelector(
      ".similar-properties-grid"
    );
    similarPropertiesGrid.innerHTML = similarProperties
      .map(
        ([title, data]) => `
                    <div class="property-card">
                        <img src="${data.images[0]}" alt="${data.title}">
                        <div class="property-card-content">
                            <h3 class="property-card-title">${data.title}</h3>
                            <p class="property-card-price">${data.price}</p>
                            <p class="property-card-location">${data.location}</p>
                            <div class="property-card-features">
                                <span><i class="fas fa-bed"></i> ${data.features.bedrooms} Bed</span>
                                <span><i class="fas fa-bath"></i> ${data.features.bathrooms} Bath</span>
                            </div>
                        </div>
                    </div>
                `
      )
      .join("");
  }
}

function getAmenityIcon(amenity) {
  const icons = {
    WiFi: "wifi",
    Parking: "parking",
    Security: "shield-alt",
    Laundry: "tshirt",
    "Air Conditioning": "snowflake",
    TV: "tv",
    Gym: "dumbbell",
  };
  return icons[amenity] || "check";
}
