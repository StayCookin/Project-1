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
    },
    updatedAt: {
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

// Remove analytics-related methods
propertySchema.methods.updateStatus = function(status) {
    this.status = status;
    this.updatedAt = new Date();
    return this.save();
};

module.exports = mongoose.model('Property', propertySchema);
