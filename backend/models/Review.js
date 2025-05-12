const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    property: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property',
        required: true
    },
    reviewer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        required: true
    },
    images: [{
        url: String,
        public_id: String
    }],
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Ensure one review per user per property
reviewSchema.index({ property: 1, reviewer: 1 }, { unique: true });

// Update property's average rating when a review is added/modified
reviewSchema.post('save', async function() {
    const Property = mongoose.model('Property');
    const reviews = await this.constructor.find({ property: this.property });
    const averageRating = reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length;
    
    await Property.findByIdAndUpdate(this.property, { averageRating });
});

module.exports = mongoose.model('Review', reviewSchema); 