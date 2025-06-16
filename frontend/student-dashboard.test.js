describe("Student Dashboard", () => {
  beforeEach(() => {
    // Reset mocks
    localStorage.getItem.mockClear();
    localStorage.setItem.mockClear();
    window.location.href = "";
    document.body.innerHTML = "";
  });

  describe("Authentication", () => {
    test("should redirect to landing page if not authenticated", () => {
      localStorage.getItem.mockReturnValue(null);
      require("../student-dashboard.html");
      expect(window.location.href).toBe("index.html");
    });

    test("should stay on dashboard if authenticated", () => {
      const mockStudentData = {
        role: "student",
        name: "Test Student",
        profileImage: "test.jpg",
      };
      localStorage.getItem.mockReturnValue(JSON.stringify(mockStudentData));
      require("../student-dashboard.html");
      expect(window.location.href).not.toBe("index.html");
    });
  });

  describe("Property Filtering", () => {
    beforeEach(() => {
      // Setup DOM elements
      document.body.innerHTML = `
                <input type="text" class="search-input">
                <select class="filter-select">
                    <option value="">All Amenities</option>
                    <option value="wifi">WiFi</option>
                </select>
                <div class="property-grid"></div>
            `;
    });

    test("should filter properties based on search term", () => {
      const searchInput = document.querySelector(".search-input");
      searchInput.value = "Modern";
      searchInput.dispatchEvent(new Event("input"));

      const propertyGrid = document.querySelector(".property-grid");
      const propertyCards = propertyGrid.querySelectorAll(".property-card");
      expect(propertyCards.length).toBeGreaterThan(0);
    });

    test("should filter properties based on amenities", () => {
      const filterSelect = document.querySelector(".filter-select");
      filterSelect.value = "wifi";
      filterSelect.dispatchEvent(new Event("change"));

      const propertyGrid = document.querySelector(".property-grid");
      const propertyCards = propertyGrid.querySelectorAll(".property-card");
      expect(propertyCards.length).toBeGreaterThan(0);
    });
  });

  describe("Property Saving", () => {
    test("should save property to localStorage", () => {
      const propertyId = 1;
      window.toggleSaveProperty(propertyId);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        "savedProperties",
        JSON.stringify([propertyId])
      );
    });

    test("should remove property from localStorage when unsaved", () => {
      const propertyId = 1;
      localStorage.getItem.mockReturnValue(JSON.stringify([propertyId]));

      window.toggleSaveProperty(propertyId);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        "savedProperties",
        JSON.stringify([])
      );
    });
  });

  describe("Navigation", () => {
    test("should handle logout correctly", () => {
      const mockStudentData = {
        role: "student",
        name: "Test Student",
      };
      localStorage.getItem.mockReturnValue(JSON.stringify(mockStudentData));

      // Mock confirm to return true
      window.confirm = jest.fn(() => true);

      const logoutBtn = document.createElement("button");
      logoutBtn.id = "logoutBtn";
      document.body.appendChild(logoutBtn);

      logoutBtn.click();

      expect(localStorage.removeItem).toHaveBeenCalledWith("studentData");
      expect(window.location.href).toBe("index.html");
    });
  });
});
