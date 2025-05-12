<<<<<<< HEAD
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    property: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    rating: {
        type: Number,
        required: [true, 'Please provide a rating'],
        min: 1,
        max: 5
    },
    title: {
        type: String,
        required: [true, 'Please provide a title'],
        trim: true,
        maxlength: [100, 'Title cannot be more than 100 characters']
    },
    comment: {
        type: String,
        required: [true, 'Please provide a comment'],
        trim: true
    },
    images: [{
        url: String,
        publicId: String
    }],
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    isVerified: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['active', 'reported', 'removed'],
        default: 'active'
    }
}, {
    timestamps: true
});

// Indexes
reviewSchema.index({ property: 1 });
reviewSchema.index({ user: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ status: 1 });

// Prevent user from submitting more than one review per property
reviewSchema.index({ property: 1, user: 1 }, { unique: true });

// Update property's average rating when a review is saved
reviewSchema.post('save', async function() {
    const Property = mongoose.model('Property');
    const property = await Property.findById(this.property);
    if (property) {
        await property.updateAverageRating();
    }
});

// Update property's average rating when a review is removed
reviewSchema.post('remove', async function() {
    const Property = mongoose.model('Property');
    const property = await Property.findById(this.property);
    if (property) {
        await property.updateAverageRating();
    }
});

module.exports = mongoose.model('Review', reviewSchema); 
// Static method to calculate average rating
ReviewSchema.statics.getAverageRating = async function(propertyId) {
    const obj = await this.aggregate([
        {
            $match: { property: propertyId }
        },
        {
            $group: {
                _id: '$property',
                averageRating: { $avg: '$rating' }
            }
        }
    ]);

    try {
        await this.model('Property').findByIdAndUpdate(propertyId, {
            averageRating: obj[0] ? obj[0].averageRating : 0
        });
    } catch (err) {
        console.error(err);
    }
};

// Call getAverageRating after save
ReviewSchema.post('save', function() {
    this.constructor.getAverageRating(this.property);
});

// Call getAverageRating before remove
ReviewSchema.pre('remove', function() {
    this.constructor.getAverageRating(this.property);
});

module.exports = mongoose.model('Review', ReviewSchema); 
=======
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
>>>>>>> c24ff08aad83fc64379c0b79e46151d3783b8082
