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
  // Handle helpful button clicks
  const helpfulButtons = document.querySelectorAll(".btn-primary");
  helpfulButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const reviewCard = this.closest(".review-card");
      const reviewerName =
        reviewCard.querySelector(".reviewer-name").textContent;
      alert(`Thank you for marking ${reviewerName}'s review as helpful!`);
    });
  });

  // Handle report button clicks
  const reportButtons = document.querySelectorAll(".btn-secondary");
  reportButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const reviewCard = this.closest(".review-card");
      const reviewerName =
        reviewCard.querySelector(".reviewer-name").textContent;
      if (
        confirm(`Are you sure you want to report ${reviewerName}'s review?`)
      ) {
        alert("Review reported. Our team will review it shortly.");
      }
    });
  });
});
