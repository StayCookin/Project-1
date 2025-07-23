// Firebase v9+ configuration and initialization
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  // Your Firebase config goes here
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};

// Initialize Firebase
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
      
      await initializeBookingSystem(user, userDoc.data());
    } catch (error) {
      console.error('Error checking user role:', error);
      showError("Authentication error. Please try logging in again.");
      setTimeout(() => {
        window.location.href = "index.html";
      }, 2000);
    }
  });
});

async function initializeBookingSystem(user, userData) {
  // Get property data from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const propertyTitle = urlParams.get("title");
  const propertyId = urlParams.get("propertyId");

  if (!propertyTitle && !propertyId) {
    showError("No property selected.");
    return;
  }

  // Load property data - prioritize propertyId for Firebase integration
  try {
    let property = null;
    
    if (propertyId) {
      // Firebase lookup by ID (preferred method)
      const propertyDoc = await getDoc(doc(db, 'properties', propertyId));
      if (!propertyDoc.exists()) {
        showError("Property not found.");
        return;
      }
      property = { id: propertyDoc.id, ...propertyDoc.data() };
    } else if (propertyTitle) {
      // Fallback to title-based lookup in Firebase
      const propertiesQuery = query(
        collection(db, 'properties'),
        where('title', '==', propertyTitle)
      );
      const querySnapshot = await getDocs(propertiesQuery);
      
      if (querySnapshot.empty) {
        showError("Property not found.");
        return;
      }
      
      // Get first matching property
      const propertyDoc = querySnapshot.docs[0];
      property = { id: propertyDoc.id, ...propertyDoc.data() };
    }

    if (!property) {
      showError("Property not found.");
      return;
    }

    displayPropertyInfo(property);
    initializeCalendar(property, user, userData);
  } catch (error) {
    console.error('Error loading property:', error);
    showError("Failed to load property details. Please try again.");
  }
}

function displayPropertyInfo(property) {
  const propertyImage = document.querySelector(".property-image");
  const propertyTitle = document.querySelector(".property-details h3");
  const propertyLocation = document.querySelector(".property-details p");

  if (propertyImage) {
    propertyImage.src = property.imageUrl || property.image || 'assets/images/default-property.jpg';
    propertyImage.alt = property.title || 'Property Image';
  }
  
  if (propertyTitle) {
    propertyTitle.textContent = property.title || 'Property Title';
  }
  
  if (propertyLocation) {
    propertyLocation.textContent = property.location || 'Location not specified';
  }
}

function initializeCalendar(property, user, userData) {
  let currentDate = new Date();
  let selectedDate = null;
  let selectedTime = null;

  // Available time slots
  const availableTimeSlots = [
    "09:00 AM",
    "10:00 AM", 
    "11:00 AM",
    "12:00 PM",
    "02:00 PM",
    "03:00 PM",
    "04:00 PM",
  ];

  function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const calendarGrid = document.getElementById("calendarGrid");
    const monthYear = document.getElementById("monthYear");
    
    if (!calendarGrid || !monthYear) {
      console.error('Calendar elements not found');
      return;
    }
    
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
      dayElement.className = "calendar-day-header";
      dayElement.textContent = day;
      calendarGrid.appendChild(dayElement);
    });

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDay; i++) {
      const emptyDay = document.createElement("div");
      emptyDay.className = "calendar-date empty";
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
        dateElement.title = "Past dates are not available";
      } else {
        dateElement.addEventListener("click", (e) => selectDate(date, e.target));
        dateElement.style.cursor = "pointer";
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
    selectedTime = null; // Reset time selection when date changes
    
    // Remove previous date selection
    document.querySelectorAll(".calendar-date").forEach((el) => {
      el.classList.remove("selected");
    });
    
    // Add selection to clicked element
    element.classList.add("selected");
    
    // Load available time slots for selected date
    updateTimeSlots(property.id, date);
    updateSubmitButton();
  }

  async function updateTimeSlots(propertyId, date) {
    const timeGrid = document.getElementById("timeGrid");
    if (!timeGrid) {
      console.error('Time grid element not found');
      return;
    }

    // Show loading state
    timeGrid.innerHTML = '<div class="loading">Loading available times...</div>';

    try {
      // Format date for Firebase query (YYYY-MM-DD)
      const dateStr = date.toISOString().split('T')[0];
      
      // Check existing bookings for this property on selected date
      const bookingsQuery = query(
        collection(db, 'viewingBookings'),
        where('propertyId', '==', propertyId),
        where('dateString', '==', dateStr), // Use dateString field for easier querying
        where('status', 'in', ['pending', 'confirmed']) // Only consider active bookings
      );
      
      const bookingsSnapshot = await getDocs(bookingsQuery);
      const bookedTimes = new Set();
      
      bookingsSnapshot.forEach((doc) => {
        const bookingData = doc.data();
        if (bookingData.time) {
          bookedTimes.add(bookingData.time);
        }
      });

      // Clear loading state
      timeGrid.innerHTML = "";

      // Create time slot elements
      availableTimeSlots.forEach((time) => {
        const timeSlot = document.createElement("div");
        timeSlot.className = "time-slot";
        
        if (bookedTimes.has(time)) {
          timeSlot.classList.add("disabled");
          timeSlot.textContent = `${time} (Booked)`;
          timeSlot.title = "This time slot is already booked";
        } else {
          timeSlot.textContent = time;
          timeSlot.style.cursor = "pointer";
          timeSlot.addEventListener("click", (e) => selectTime(time, e.target));
        }

        // Highlight selected time
        if (selectedTime === time && !bookedTimes.has(time)) {
          timeSlot.classList.add("selected");
        }

        timeGrid.appendChild(timeSlot);
      });

      // Show message if no slots available
      if (bookedTimes.size === availableTimeSlots.length) {
        const noSlotsMsg = document.createElement("div");
        noSlotsMsg.className = "no-slots-message";
        noSlotsMsg.textContent = "No available time slots for this date. Please select another date.";
        timeGrid.appendChild(noSlotsMsg);
      }

    } catch (error) {
      console.error('Error loading time slots:', error);
      timeGrid.innerHTML = '<div class="error">Error loading time slots. Please try again.</div>';
      
      // Fallback: show all slots as available
      setTimeout(() => {
        timeGrid.innerHTML = "";
        availableTimeSlots.forEach((time) => {
          const timeSlot = document.createElement("div");
          timeSlot.className = "time-slot";
          timeSlot.textContent = time;
          timeSlot.style.cursor = "pointer";
          timeSlot.addEventListener("click", (e) => selectTime(time, e.target));

          if (selectedTime === time) {
            timeSlot.classList.add("selected");
          }

          timeGrid.appendChild(timeSlot);
        });
      }, 2000);
    }
  }

  function selectTime(time, element) {
    selectedTime = time;
    
    // Remove previous time selection
    document.querySelectorAll(".time-slot").forEach((el) => {
      el.classList.remove("selected");
    });
    
    // Add selection to clicked element
    element.classList.add("selected");
    updateSubmitButton();
  }

  function updateSubmitButton() {
    const submitBtn = document.getElementById("submitBtn");
    if (submitBtn) {
      submitBtn.disabled = !(selectedDate && selectedTime);
      submitBtn.textContent = (selectedDate && selectedTime) ? "Submit Viewing Request" : "Select Date & Time";
    }
  }

  // Calendar navigation
  const prevMonthBtn = document.getElementById("prevMonth");
  const nextMonthBtn = document.getElementById("nextMonth");

  if (prevMonthBtn) {
    prevMonthBtn.addEventListener("click", () => {
      currentDate.setMonth(currentDate.getMonth() - 1);
      selectedDate = null; // Reset selection when changing months
      selectedTime = null;
      renderCalendar();
      updateSubmitButton();
    });
  }

  if (nextMonthBtn) {
    nextMonthBtn.addEventListener("click", () => {
      currentDate.setMonth(currentDate.getMonth() + 1);
      selectedDate = null; // Reset selection when changing months
      selectedTime = null;
      renderCalendar();
      updateSubmitButton();
    });
  }

  // Form submission
  const bookingForm = document.getElementById("bookingForm");
  if (bookingForm) {
    bookingForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      if (!selectedDate || !selectedTime) {
        showError("Please select both date and time for your viewing.");
        return;
      }

      // Get form data
      const formData = {
        name: document.getElementById("name")?.value?.trim() || "",
        phone: document.getElementById("phone")?.value?.trim() || "",
        email: document.getElementById("email")?.value?.trim() || "",
        notes: document.getElementById("notes")?.value?.trim() || ""
      };

      // Validate required fields
      if (!formData.name || !formData.phone || !formData.email) {
        showError("Please fill in all required fields (Name, Phone, Email).");
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        showError("Please enter a valid email address.");
        return;
      }

      // Show loading state
      const submitBtn = document.getElementById("submitBtn");
      const originalText = submitBtn.textContent;
      submitBtn.textContent = "Submitting...";
      submitBtn.disabled = true;

      try {
        // Create booking object
        const booking = {
          // Property information
          propertyId: property.id,
          propertyTitle: property.title,
          propertyLocation: property.location,
          
          // User information
          userId: user.uid,
          userEmail: user.email,
          
          // Booking details
          date: Timestamp.fromDate(selectedDate), // Firebase Timestamp
          dateString: selectedDate.toISOString().split('T')[0], // For easier querying
          time: selectedTime,
          
          // Contact information
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          notes: formData.notes,
          
          // Metadata
          status: "pending",
          createdAt: Timestamp.fromDate(new Date()),
          updatedAt: Timestamp.fromDate(new Date())
        };

        // Double-check availability before saving
        const dateStr = selectedDate.toISOString().split('T')[0];
        const conflictQuery = query(
          collection(db, 'viewingBookings'),
          where('propertyId', '==', property.id),
          where('dateString', '==', dateStr),
          where('time', '==', selectedTime),
          where('status', 'in', ['pending', 'confirmed'])
        );
        
        const conflictSnapshot = await getDocs(conflictQuery);
        
        if (!conflictSnapshot.empty) {
          throw new Error("This time slot has just been booked by someone else. Please select another time.");
        }

        // Save booking to Firebase
        const docRef = await addDoc(collection(db, 'viewingBookings'), booking);
        
        showSuccess("Viewing request submitted successfully! You will be contacted soon to confirm your appointment.");
        
        // Clear form and selections
        bookingForm.reset();
        selectedDate = null;
        selectedTime = null;
        renderCalendar();
        updateSubmitButton();

        // Redirect after a short delay
        setTimeout(() => {
          window.location.href = "viewings.html";
        }, 2000);

      } catch (error) {
        console.error('Error submitting booking:', error);
        showError("Failed to submit booking: " + (error.message || "Please try again."));
      } finally {
        // Restore button state
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
    if (emailField && (userData.email || user.email)) {
      emailField.value = userData.email || user.email;
    }
  }

  // Initialize calendar
  renderCalendar();
  updateSubmitButton();
}

// Utility functions
function showError(message) {
  const errorContainer = document.getElementById("errorContainer");
  if (errorContainer) {
    errorContainer.innerHTML = `<div class="error-message" style="color: #dc3545; padding: 10px; margin: 10px 0; border: 1px solid #dc3545; border-radius: 4px; background-color: #f8d7da;">${message}</div>`;
    errorContainer.scrollIntoView({ behavior: 'smooth' });
  } else {
    alert("Error: " + message);
  }
  
  // Auto-hide error after 5 seconds
  setTimeout(() => {
    if (errorContainer) {
      errorContainer.innerHTML = "";
    }
  }, 5000);
}

function showSuccess(message) {
  const errorContainer = document.getElementById("errorContainer");
  if (errorContainer) {
    errorContainer.innerHTML = `<div class="success-message" style="color: #155724; padding: 10px; margin: 10px 0; border: 1px solid #c3e6cb; border-radius: 4px; background-color: #d4edda;">${message}</div>`;
    errorContainer.scrollIntoView({ behavior: 'smooth' });
  } else {
    alert(message);
  }
  
  // Auto-hide success message after 3 seconds
  setTimeout(() => {
    if (errorContainer) {
      errorContainer.innerHTML = "";
    }
  }, 3000);
}