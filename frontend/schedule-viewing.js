// Firebase v9+ imports (add these to your HTML head)
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, addDoc, query, where, getDocs } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  // Your Firebase config
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

document.addEventListener("DOMContentLoaded", function () {
  // Check authentication state
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      // Redirect to login if not authenticated
      window.location.href = "index.html";
      return;
    }

    // Verify user role is student
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists() || userDoc.data().role !== 'student') {
        window.location.href = "index.html";
        return;
      }
      
      initializeBookingSystem(user, userDoc.data());
    } catch (error) {
      console.error('Error checking user role:', error);
      window.location.href = "index.html";
    }
  });
});

async function initializeBookingSystem(user, userData) {
  // Get property data from URL parameters - maintaining original parameter name
  const urlParams = new URLSearchParams(window.location.search);
  const propertyTitle = urlParams.get("title"); // Keep original parameter name
  const propertyId = urlParams.get("propertyId"); // Also support propertyId for Firebase

  if (!propertyTitle && !propertyId) {
    showError("No property selected.");
    return;
  }

  // Load property data - support both title-based and ID-based lookup
  try {
    let property;
    
    if (propertyId) {
      // Firebase lookup by ID
      const propertyDoc = await getDoc(doc(db, 'properties', propertyId));
      if (!propertyDoc.exists()) {
        showError("Property not found.");
        return;
      }
      property = { id: propertyDoc.id, ...propertyDoc.data() };
    } else {
      // Fallback to title-based lookup (for backward compatibility)
      property = getPropertyData(propertyTitle);
      if (!property) {
        showError("Property not found.");
        return;
      }
    }

    displayPropertyInfo(property);
    initializeCalendar(property, user, userData, propertyTitle || propertyId);
  } catch (error) {
    console.error('Error loading property:', error);
    showError("Failed to load property details.");
  }
}

function displayPropertyInfo(property) {
  document.querySelector(".property-image").src = property.imageUrl || 'default-image.jpg';
  document.querySelector(".property-details h3").textContent = property.title;
  document.querySelector(".property-details p").textContent = property.location;
}

function initializeCalendar(property, user, userData, propertyIdentifier) {
  let currentDate = new Date();
  let selectedDate = null;
  let selectedTime = null;

  function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const calendarGrid = document.getElementById("calendarGrid");
    const monthYear = document.getElementById("monthYear");
    
    // Update month/year display
    monthYear.textContent = firstDay.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });

    calendarGrid.innerHTML = "";

    // Add day headers
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    days.forEach((day) => {
      const dayElement = document.createElement("div");
      dayElement.className = "calendar-day";
      dayElement.textContent = day;
      calendarGrid.appendChild(dayElement);
    });

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDay; i++) {
      const emptyDay = document.createElement("div");
      emptyDay.className = "calendar-date";
      calendarGrid.appendChild(emptyDay);
    }

    // Add dates
    for (let day = 1; day <= daysInMonth; day++) {
      const dateElement = document.createElement("div");
      dateElement.className = "calendar-date";
      dateElement.textContent = day;

      const date = new Date(year, month, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Disable past dates
      if (date < today) {
        dateElement.classList.add("disabled");
      } else {
        dateElement.addEventListener("click", () => selectDate(date, dateElement));
      }

      // Highlight selected date
      if (selectedDate && date.toDateString() === selectedDate.toDateString()) {
        dateElement.classList.add("selected");
      }

      calendarGrid.appendChild(dateElement);
    }
  }

  function selectDate(date, element) {
    selectedDate = date;
    
    // Remove previous selection
    document.querySelectorAll(".calendar-date").forEach((el) => {
      el.classList.remove("selected");
    });
    
    // Add selection to clicked element
    element.classList.add("selected");
    
    // Load available time slots for selected date
    updateTimeSlots(property.id || propertyIdentifier, date);
    updateSubmitButton();
  }

  async function updateTimeSlots(propertyIdentifier, date) {
    const timeGrid = document.getElementById("timeGrid");
    timeGrid.innerHTML = "";

    const timeSlots = [ // Maintaining original variable name
      "09:00 AM",
      "10:00 AM", 
      "11:00 AM",
      "02:00 PM",
      "03:00 PM",
      "04:00 PM",
    ];

    try {
      // Check existing bookings for this property on selected date
      const dateStr = date.toISOString().split('T')[0];
      const bookingsQuery = query(
        collection(db, 'viewingBookings'),
        where('propertyId', '==', propertyIdentifier),
        where('date', '==', dateStr)
      );
      
      const bookingsSnapshot = await getDocs(bookingsQuery);
      const bookedTimes = new Set();
      
      bookingsSnapshot.forEach((doc) => {
        bookedTimes.add(doc.data().time);
      });

      // Create time slot elements - maintaining original structure
      timeSlots.forEach((time) => {
        const timeSlot = document.createElement("div");
        timeSlot.className = "time-slot";
        timeSlot.textContent = time;

        if (bookedTimes.has(time)) {
          timeSlot.classList.add("disabled");
          timeSlot.textContent += " (Booked)";
        } else {
          timeSlot.addEventListener("click", () => selectTime(time));
        }

        if (selectedTime === time && !bookedTimes.has(time)) {
          timeSlot.classList.add("selected");
        }

        timeGrid.appendChild(timeSlot);
      });
    } catch (error) {
      console.error('Error loading time slots:', error);
      // Fallback: randomly disable some time slots for demo (maintaining original logic)
      timeSlots.forEach((time) => {
        const timeSlot = document.createElement("div");
        timeSlot.className = "time-slot";
        timeSlot.textContent = time;

        // Randomly disable some time slots for demo
        if (Math.random() > 0.7) {
          timeSlot.classList.add("disabled");
        } else {
          timeSlot.addEventListener("click", () => selectTime(time));
        }

        if (selectedTime === time) {
          timeSlot.classList.add("selected");
        }

        timeGrid.appendChild(timeSlot);
      });
    }
  }

  function selectTime(time) {
    selectedTime = time;
    
    // Remove previous selection
    document.querySelectorAll(".time-slot").forEach((el) => {
      el.classList.remove("selected");
    });
    
    // Add selection using event.target (maintaining original approach)
    event.target.classList.add("selected");
    updateSubmitButton();
  }

  function updateSubmitButton() {
    const submitBtn = document.getElementById("submitBtn");
    if (submitBtn) {
      submitBtn.disabled = !(selectedDate && selectedTime);
    }
  }

  // Calendar navigation
  document.getElementById("prevMonth")?.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });

  document.getElementById("nextMonth")?.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });

  // Form submission
  const bookingForm = document.getElementById("bookingForm");
  if (bookingForm) {
    bookingForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      if (!selectedDate || !selectedTime) {
        showError("Please select both date and time.");
        return;
      }

      // Show loading state
      const submitBtn = document.getElementById("submitBtn");
      const originalText = submitBtn.textContent;
      submitBtn.textContent = "Booking...";
      submitBtn.disabled = true;

      try {
        const booking = {
          propertyId: property.id || propertyIdentifier,
          propertyTitle: propertyTitle || property.title, // Maintain original field name
          userId: user.uid,
          userEmail: user.email,
          date: selectedDate.toISOString(),
          time: selectedTime,
          name: document.getElementById("name").value.trim(),
          phone: document.getElementById("phone").value.trim(),
          email: document.getElementById("email").value.trim(),
          notes: document.getElementById("notes").value.trim(),
          studentId: user.uid, // Maintain original field name for compatibility
          status: "pending",
          timestamp: new Date().toISOString(), // Maintain original field name
        };

        // Validate required fields
        if (!booking.name || !booking.phone || !booking.email) {
          throw new Error("Please fill in all required fields.");
        }

        // Save booking to Firebase (replacing localStorage)
        await addDoc(collection(db, 'viewingBookings'), booking);

        alert("Viewing request submitted successfully!"); // Maintaining original alert
        window.location.href = "viewings.html"; // Immediate redirect like original

      } catch (error) {
        console.error('Error submitting booking:', error);
        showError("Failed to submit booking: " + error.message);
        
        // Restore button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });
  }

  // Pre-fill form with user data
  if (userData) {
    const nameField = document.getElementById("name");
    const emailField = document.getElementById("email");
    
    if (nameField && userData.name) {
      nameField.value = userData.name;
    }
    if (emailField && userData.email) {
      emailField.value = userData.email;
    }
  }

  // Initialize calendar and time slots (maintaining original call structure)
  renderCalendar();
  updateTimeSlots(property.id || propertyIdentifier, new Date());
}

// Add the original getPropertyData function for backward compatibility
function getPropertyData(title) {
  // For demo purposes, return hardcoded data (maintaining original structure)
  const properties = {
    "Modern Apartment near UB": {
      title: "Modern Apartment near UB",
      location: "Gaborone, Near UB Campus",
      image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    },
    "Cozy Studio near Baisago": {
      title: "Cozy Studio near Baisago", 
      location: "Gaborone, Near Baisago Campus",
      image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    },
    "Luxury Apartment near Botho": {
      title: "Luxury Apartment near Botho",
      location: "Gaborone, Near Botho Campus", 
      image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    },
  };
  return properties[title];
}
function showError(message) {
  const errorContainer = document.getElementById("errorContainer");
  if (errorContainer) {
    errorContainer.innerHTML = `<div class="error-message">${message}</div>`;
  } else {
    alert("Error: " + message);
  }
}

function showSuccess(message) {
  const errorContainer = document.getElementById("errorContainer");
  if (errorContainer) {
    errorContainer.innerHTML = `<div class="success-message">${message}</div>`;
  } else {
    alert(message);
  }
}