const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const auth = require("../middleware/auth");
const Review = require("../models/Review");
const Property = require("../models/Property");

// @route   POST api/reviews/:propertyId
// @desc    Create a review
// @access  Private (Students only)
router.post(
  "/:propertyId",
  [
    auth,
    [
      check("rating", "Rating must be between 1 and 5").isInt({
        min: 1,
        max: 5,
      }),
      check("text", "Review text is required").not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Check if user is a student
      if (req.user.role !== "student") {
        return res.status(403).json({ msg: "Only students can write reviews" });
      }

      // Check if property exists
      const property = await Property.findById(req.params.propertyId);
      if (!property) {
        return res.status(404).json({ msg: "Property not found" });
      }

      // Check if user already reviewed this property
      const existingReview = await Review.findOne({
        property: req.params.propertyId,
        user: req.user.id,
      });

      if (existingReview) {
        return res
          .status(400)
          .json({ msg: "You have already reviewed this property" });
      }

      // Create review
      const review = new Review({
        property: req.params.propertyId,
        user: req.user.id,
        rating: req.body.rating,
        text: req.body.text,
      });

      await review.save();

      // Add review to property
      property.reviews.push(review._id);
      await property.save();

      res.json(review);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

// @route   GET api/reviews/property/:propertyId
// @desc    Get all reviews for a property
// @access  Public
router.get("/property/:propertyId", async (req, res) => {
  try {
    const reviews = await Review.find({ property: req.params.propertyId })
      .populate("user", ["name"])
      .sort("-createdAt");
    res.json(reviews);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route   PUT api/reviews/:id
// @desc    Update a review
// @access  Private (Review owner only)
router.put(
  "/:id",
  [
    auth,
    [
      check("rating", "Rating must be between 1 and 5").isInt({
        min: 1,
        max: 5,
      }),
      check("text", "Review text is required").not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const review = await Review.findById(req.params.id);

      if (!review) {
        return res.status(404).json({ msg: "Review not found" });
      }

      // Make sure user owns review
      if (review.user.toString() !== req.user.id) {
        return res.status(401).json({ msg: "User not authorized" });
      }

      review.rating = req.body.rating;
      review.text = req.body.text;
      await review.save();

      res.json(review);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

// @route   DELETE api/reviews/:id
// @desc    Delete a review
// @access  Private (Review owner only)
router.delete("/:id", auth, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ msg: "Review not found" });
    }

    // Make sure user owns review
    if (review.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "User not authorized" });
    }

    await review.remove();

    res.json({ msg: "Review removed" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;

document.addEventListener("DOMContentLoaded", function () {
  fetchReviews();
});

async function fetchReviews() {
  try {
    const res = await fetch("/api/reviews");
    if (!res.ok) throw new Error("Failed to fetch reviews");
    const reviews = await res.json();
    renderReviews(reviews);
  } catch (err) {
    document.getElementById("reviewsContainer").innerHTML =
      '<div class="empty-state">Failed to load reviews.</div>';
  }
}

function renderReviews(reviews) {
  const container = document.getElementById("reviewsContainer");
  container.innerHTML = "";
  if (!reviews.length) {
    container.innerHTML = '<div class="empty-state">No reviews found.</div>';
    return;
  }
  reviews.forEach((review) => {
    const card = document.createElement("div");
    card.className = "review-card";
    card.innerHTML = `
      <div class="review-header">
        <div class="reviewer-info">
          <div class="reviewer-avatar">${review.reviewerInitials}</div>
          <div>
            <div class="reviewer-name">${review.reviewerName}</div>
            <div class="review-date">${review.date}</div>
          </div>
        </div>
        <div class="review-rating">${"★".repeat(review.rating)}${"☆".repeat(
      5 - review.rating
    )}</div>
      </div>
      <div class="review-content">${review.text}</div>
      <div class="review-property">
        <img
          src="${review.propertyImage || "/img/default-property.jpg"}"
          alt="${review.propertyTitle}"
          class="property-image"
        />
        <div class="property-info">
          <h4>${review.propertyTitle}</h4>
          <p>${review.propertyLocation}</p>
        </div>
      </div>
      <div class="review-actions">
        <button
          class="btn btn-primary"
          onclick="markHelpful('${review._id}')"
        >
          <i class="fas fa-thumbs-up"></i> Helpful
        </button>
        <button
          class="btn btn-secondary"
          onclick="reportReview('${review._id}')"
        >
          <i class="fas fa-flag"></i> Report
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

function markHelpful(reviewId) {
  fetch(`/api/reviews/${reviewId}/helpful`, { method: "POST" }).then((res) =>
    res.ok ? alert("Marked as helpful!") : alert("Failed to mark as helpful.")
  );
}

function reportReview(reviewId) {
  fetch(`/api/reviews/${reviewId}/report`, { method: "POST" }).then((res) =>
    res.ok ? alert("Reported!") : alert("Failed to report.")
  );
}
