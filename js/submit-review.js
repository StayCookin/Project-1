// js/submit-review.js
// Handles review submission for the submit-review page

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("submitReviewForm");
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const rating = document.getElementById("rating").value;
    const text = document.getElementById("reviewText").value.trim();
    if (!rating || !text) {
      alert("Please provide a rating and review text.");
      return;
    }
    try {
      // You may want to get propertyId from URL or context
      const urlParams = new URLSearchParams(window.location.search);
      const propertyId = urlParams.get("propertyId");
      if (!propertyId) throw new Error("No property selected.");
      const res = await fetch(`/api/reviews/${propertyId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, text }),
      });
      if (!res.ok) throw new Error("Failed to submit review");
      document.getElementById("reviewFormSuccess").textContent =
        "Thank you for your review!";
      form.reset();
    } catch (err) {
      alert("Failed to submit review: " + err.message);
    }
  });
});
