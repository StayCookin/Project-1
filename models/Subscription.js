<<<<<<< HEAD
const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    landlord: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'cancelled', 'expired'],
        default: 'active'
    },
    plan: {
        type: String,
        enum: ['basic', 'premium'],
        default: 'basic'
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date,
        required: true
    },
    autoRenew: {
        type: Boolean,
        default: true
    },
    paymentMethod: {
        type: String,
        required: true
    },
    lastPayment: {
        amount: Number,
        date: Date,
        transactionId: String
    },
    features: {
        priorityListing: {
            type: Boolean,
            default: false
        },
        analytics: {
            type: Boolean,
            default: false
        },
        premiumSupport: {
            type: Boolean,
            default: false
        }
    }
}, {
    timestamps: true
});

// Pre-save hook to set end date
subscriptionSchema.pre('save', function(next) {
    if (this.isNew) {
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);
        this.endDate = endDate;
    }
    next();
});

// Instance method to check if subscription is active
subscriptionSchema.methods.isActive = function() {
    return this.status === 'active' && this.endDate > new Date();
};

// Instance method to renew subscription
subscriptionSchema.methods.renew = function() {
    const newEndDate = new Date(this.endDate);
    newEndDate.setMonth(newEndDate.getMonth() + 1);
    this.endDate = newEndDate;
    return this.save();
};

// Instance method to cancel subscription
subscriptionSchema.methods.cancel = function() {
    this.status = 'cancelled';
    this.autoRenew = false;
    return this.save();
};

// Static method to get active subscriptions
subscriptionSchema.statics.getActiveSubscriptions = function() {
    return this.find({
        status: 'active',
        endDate: { $gt: new Date() }
    }).populate('landlord');
};

=======
const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    landlord: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'cancelled', 'expired'],
        default: 'active'
    },
    plan: {
        type: String,
        enum: ['basic', 'premium'],
        default: 'basic'
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date,
        required: true
    },
    autoRenew: {
        type: Boolean,
        default: true
    },
    paymentMethod: {
        type: String,
        required: true
    },
    lastPayment: {
        amount: Number,
        date: Date,
        transactionId: String
    },
    features: {
        priorityListing: {
            type: Boolean,
            default: false
        },
        analytics: {
            type: Boolean,
            default: false
        },
        premiumSupport: {
            type: Boolean,
            default: false
        }
    }
}, {
    timestamps: true
});

// Pre-save hook to set end date
subscriptionSchema.pre('save', function(next) {
    if (this.isNew) {
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);
        this.endDate = endDate;
    }
    next();
});

// Instance method to check if subscription is active
subscriptionSchema.methods.isActive = function() {
    return this.status === 'active' && this.endDate > new Date();
};

// Instance method to renew subscription
subscriptionSchema.methods.renew = function() {
    const newEndDate = new Date(this.endDate);
    newEndDate.setMonth(newEndDate.getMonth() + 1);
    this.endDate = newEndDate;
    return this.save();
};

// Instance method to cancel subscription
subscriptionSchema.methods.cancel = function() {
    this.status = 'cancelled';
    this.autoRenew = false;
    return this.save();
};

// Static method to get active subscriptions
subscriptionSchema.statics.getActiveSubscriptions = function() {
    return this.find({
        status: 'active',
        endDate: { $gt: new Date() }
    }).populate('landlord');
};

>>>>>>> c24ff08aad83fc64379c0b79e46151d3783b8082
module.exports = mongoose.model('Subscription', subscriptionSchema); 