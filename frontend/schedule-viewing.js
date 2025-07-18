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

  // Load property data
  if (propertyTitle) {
    const property = getPropertyData(propertyTitle);
    if (property) {
      document.querySelector(".property-image").src = property.image;
      document.querySelector(".property-details h3").textContent =
        property.title;
      document.querySelector(".property-details p").textContent =
        property.location;
    }
  }

  // Initialize calendar
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
    calendarGrid.innerHTML = "";

    // Add day headers
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    days.forEach((day) => {
      const dayElement = document.createElement("div");
      dayElement.className = "calendar-day";
      dayElement.textContent = day;
      calendarGrid.appendChild(dayElement);
    });

    // Add dates
    for (let i = 0; i < startingDay; i++) {
      const emptyDay = document.createElement("div");
      emptyDay.className = "calendar-date";
      calendarGrid.appendChild(emptyDay);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateElement = document.createElement("div");
      dateElement.className = "calendar-date";
      dateElement.textContent = day;

      const date = new Date(year, month, day);
      if (date < new Date().setHours(0, 0, 0, 0)) {
        dateElement.classList.add("disabled");
      } else {
        dateElement.addEventListener("click", () => selectDate(date));
      }

      if (selectedDate && date.toDateString() === selectedDate.toDateString()) {
        dateElement.classList.add("selected");
      }

      calendarGrid.appendChild(dateElement);
    }
  }

  function selectDate(date) {
    selectedDate = date;
    document.querySelectorAll(".calendar-date").forEach((el) => {
      el.classList.remove("selected");
    });
    event.target.classList.add("selected");
    updateTimeSlots();
    updateSubmitButton();
  }

  function updateTimeSlots() {
    const timeGrid = document.getElementById("timeGrid");
    timeGrid.innerHTML = "";

    const timeSlots = [
      "09:00 AM",
      "10:00 AM",
      "11:00 AM",
      "02:00 PM",
      "03:00 PM",
      "04:00 PM",
    ];

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

  function selectTime(time) {
    selectedTime = time;
    document.querySelectorAll(".time-slot").forEach((el) => {
      el.classList.remove("selected");
    });
    event.target.classList.add("selected");
    updateSubmitButton();
  }

  function updateSubmitButton() {
    const submitBtn = document.getElementById("submitBtn");
    submitBtn.disabled = !(selectedDate && selectedTime);
  }

  // Calendar navigation
  document.getElementById("prevMonth").addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });

  document.getElementById("nextMonth").addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });

  // Form submission
  const bookingForm = document.getElementById("bookingForm");
  bookingForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const booking = {
      propertyTitle: propertyTitle,
      date: selectedDate.toISOString(),
      time: selectedTime,
      name: document.getElementById("name").value,
      phone: document.getElementById("phone").value,
      email: document.getElementById("email").value,
      notes: document.getElementById("notes").value,
      studentId: studentData.id,
      status: "pending",
      timestamp: new Date().toISOString(),
    };

    // Save booking to localStorage
    const bookings = JSON.parse(
      localStorage.getItem("viewingBookings") || "[]"
    );
    bookings.push(booking);
    localStorage.setItem("viewingBookings", JSON.stringify(bookings));

    alert("Viewing request submitted successfully!");
    window.location.href = "viewings.html";
  });

  // Initialize calendar and time slots
  renderCalendar();
  updateTimeSlots();

  // Pre-fill form with student data
  if (studentData) {
    document.getElementById("name").value = studentData.name;
    document.getElementById("email").value = studentData.email;
  }
});

function getPropertyData(title) {
  // For demo purposes, return hardcoded data
  const properties = {
    "Modern Apartment near UB": {
      title: "Modern Apartment near UB",
      location: "Gaborone, Near UB Campus",
      image:
        "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    },
    "Cozy Studio near Baisago": {
      title: "Cozy Studio near Baisago",
      location: "Gaborone, Near Baisago Campus",
      image:
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    },
    "Luxury Apartment near Botho": {
      title: "Luxury Apartment near Botho",
      location: "Gaborone, Near Botho Campus",
      image:
        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    },
  };
  return properties[title];
}

document.addEventListener("DOMContentLoaded", () => {
  fetchScheduleData();
});

async function fetchScheduleData() {
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get("propertyId");
  if (!propertyId) {
    document.getElementById("scheduleContainer").innerHTML =
      '<div class="empty-state">No property selected.</div>';
    return;
  }
  try {
    const res = await fetch(`/api/properties/${propertyId}`);
    if (!res.ok) throw new Error("Failed to fetch property");
    const property = await res.json();
    renderSchedule(property);
  } catch (err) {
    document.getElementById("scheduleContainer").innerHTML =
      '<div class="empty-state">Failed to load property.</div>';
  }
}

function renderSchedule(property) {
  const container = document.getElementById("scheduleContainer");
  container.innerHTML = `
            <div class="property-info">
              <img src="${
                property.imageUrl || "/img/default-property.jpg"
              }" alt="Property" class="property-image" />
              <div class="property-details">
                <h3>${property.title}</h3>
                <p>${property.location}</p>
              </div>
            </div>
            <form id="bookingForm" class="booking-form">
              <div class="form-group">
                <label class="form-label">Your Name</label>
                <input type="text" class="form-input" id="name" required />
              </div>
              <div class="form-group">
                <label class="form-label">Preferred Date</label>
                <input type="date" class="form-input" id="date" required />
              </div>
              <div class="form-group">
                <label class="form-label">Preferred Time</label>
                <select class="form-input" id="time" required>
                  <option value="">Select time</option>
                  <option value="morning">Morning (9AM - 12PM)</option>
                  <option value="afternoon">Afternoon (1PM - 4PM)</option>
                  <option value="evening">Evening (5PM - 7PM)</option>
                </select>
              </div>
              <button type="submit" class="btn btn-primary"><i class="fas fa-calendar-check"></i> Schedule Viewing</button>
            </form>
          `;
  document
    .getElementById("bookingForm")
    .addEventListener("submit", async function (e) {
      e.preventDefault();
      const name = document.getElementById("name").value;
      const date = document.getElementById("date").value;
      const time = document.getElementById("time").value;
      try {
        const res = await fetch("/api/viewings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ propertyId: property._id, name, date, time }),
        });
        if (!res.ok) throw new Error("Failed to schedule viewing");
        alert("Viewing scheduled!");
        this.reset();
      } catch (err) {
        alert("Failed to schedule viewing: " + err.message);
      }
    });
}
