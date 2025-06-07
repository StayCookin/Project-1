document.addEventListener("DOMContentLoaded", function () {
  // Handle remove button clicks
  const removeButtons = document.querySelectorAll(".btn-secondary");
  removeButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const card = this.closest(".property-card");
      const title = card.querySelector(".property-title").textContent;
      if (
        confirm(
          `Are you sure you want to remove ${title} from your saved properties?`
        )
      ) {
        card.remove();
        // Check if no properties left
        if (document.querySelectorAll(".property-card").length === 0) {
          showEmptyState();
        }
      }
    });
  });

  function showEmptyState() {
    const grid = document.querySelector(".saved-properties-grid");
    grid.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-heart"></i>
                        <h2>No Saved Properties</h2>
                        <p>You haven't saved any properties yet. Start exploring to find your perfect place!</p>
                        <button class="btn btn-primary" onclick="window.location.href='student-dashboard.html'">
                            <i class="fas fa-search"></i> Browse Properties
                        </button>
                    </div>
                `;
  }
});
