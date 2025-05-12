<<<<<<< HEAD
const mongoose = require('mongoose');

const PropertySchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: [true, 'Please add a title'],
        trim: true,
        maxlength: [100, 'Title cannot be more than 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Please add a description'],
        maxlength: [1000, 'Description cannot be more than 1000 characters']
    },
    type: {
        type: String,
        enum: ['apartment', 'house', 'commercial', 'student'],
        required: true
    },
    price: {
        type: Number,
        required: [true, 'Please add a price']
    },
    location: {
        type: String,
        required: [true, 'Please add a location']
    },
    photos: [{
        type: String,
        required: [true, 'Please add at least 3 photos']
    }],
    documents: {
        titleDeed: {
            type: String,
            required: [true, 'Please upload title deed']
        }
    },
    amenities: [{
        type: String
    }],
    ratings: {
        condition: {
            type: Number,
            min: 1,
            max: 10,
            required: true
        },
        safety: {
            type: Number,
            min: 1,
            max: 10,
            required: true
        }
    },
    status: {
        type: String,
        enum: ['available', 'rented', 'pending', 'inactive'],
        default: 'pending'
    },
    verified: {
        type: Boolean,
        default: false
    },
    averageRating: {
        type: Number,
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot be more than 5']
    },
    reviews: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Review'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    isPremium: {
        type: Boolean,
        default: false
    },
    listingPriority: {
        type: Number,
        default: 0 // Higher number = higher priority
    },
    featuredUntil: {
        type: Date
    },
    analytics: {
        views: {
            type: Number,
            default: 0
        },
        inquiries: {
            type: Number,
            default: 0
        },
        favorited: {
            type: Number,
            default: 0
        },
        lastViewed: Date
    }
}, {
    timestamps: true
});

// Middleware to ensure at least 3 photos
PropertySchema.pre('save', function(next) {
    if (this.photos.length < 3) {
        next(new Error('Please upload at least 3 photos'));
    }
    next();
});

// Update listing priority based on subscription
PropertySchema.methods.updatePremiumStatus = async function() {
    const Subscription = mongoose.model('Subscription');
    const subscription = await Subscription.findOne({
        landlord: this.owner,
        status: 'active'
    });

    this.isPremium = !!subscription;
    this.listingPriority = subscription ? 100 : 0;
    return this.save();
};

// Increment view count
PropertySchema.methods.incrementViews = function() {
    this.analytics.views += 1;
    this.analytics.lastViewed = new Date();
    return this.save();
};

// Static method to get premium listings
PropertySchema.statics.getPremiumListings = function() {
    return this.find({
        isPremium: true,
        isAvailable: true
    }).sort('-listingPriority createdAt');
};

module.exports = mongoose.model('Property', PropertySchema); 
=======
const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String
    },
    type: {
        type: String,
        enum: ['apartment', 'house', 'studio', 'shared'],
        required: true
    },
    features: {
        bedrooms: Number,
        bathrooms: Number,
        area: Number,
        furnished: Boolean,
        parking: Boolean,
        wifi: Boolean,
        security: Boolean,
        laundry: Boolean
    },
    images: [{
        url: String,
        public_id: String
    }],
    landlord: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['available', 'rented', 'pending'],
        default: 'available'
    },
    savedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    reviews: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Review'
    }],
    averageRating: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for search functionality
propertySchema.index({ 
    title: 'text', 
    description: 'text', 
    location: 'text' 
});

module.exports = mongoose.model('Property', propertySchema); 
>>>>>>> c24ff08aad83fc64379c0b79e46151d3783b8082
