<<<<<<< HEAD
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    tenant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    landlord: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    property: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    commission: {
        type: Number,
        required: true
    },
    commissionPercentage: {
        type: Number,
        required: true
    },
    landlordAmount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
    },
    paymentDate: {
        type: Date,
        default: Date.now
    },
    dueDate: {
        type: Date,
        required: true
    },
    transactionId: String,
    paymentReference: {
        type: String,
        unique: true
    },
    paymentMethod: {
        type: String,
        enum: ['card', 'bank_transfer'],
        required: true
    },
    metadata: {
        type: Map,
        of: String
    }
}, {
    timestamps: true
});

// Calculate commission before saving
paymentSchema.pre('save', function(next) {
    if (this.amount) {
        if (this.amount >= 2500) {
            this.commissionPercentage = 15;
        } else if (this.amount >= 1500) {
            this.commissionPercentage = 10;
        } else {
            this.commissionPercentage = 5;
        }
        
        this.commission = (this.amount * this.commissionPercentage) / 100;
        this.landlordAmount = this.amount - this.commission;
    }
    next();
});

// Index for faster queries
paymentSchema.index({ property: 1, tenant: 1, createdAt: -1 });
paymentSchema.index({ landlord: 1, status: 1 });

// Virtual for commission percentage
paymentSchema.virtual('commissionPercentage').get(function() {
    return (this.commission / this.amount) * 100;
});

// Method to check if payment can be refunded
paymentSchema.methods.canBeRefunded = function() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return this.status === 'completed' && this.createdAt > thirtyDaysAgo;
};

=======
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    tenant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    landlord: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    property: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    commission: {
        type: Number,
        required: true
    },
    commissionPercentage: {
        type: Number,
        required: true
    },
    landlordAmount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
    },
    paymentDate: {
        type: Date,
        default: Date.now
    },
    dueDate: {
        type: Date,
        required: true
    },
    transactionId: String,
    paymentReference: {
        type: String,
        unique: true
    },
    paymentMethod: {
        type: String,
        enum: ['card', 'bank_transfer'],
        required: true
    },
    metadata: {
        type: Map,
        of: String
    }
}, {
    timestamps: true
});

// Calculate commission before saving
paymentSchema.pre('save', function(next) {
    if (this.amount) {
        if (this.amount >= 2500) {
            this.commissionPercentage = 15;
        } else if (this.amount >= 1500) {
            this.commissionPercentage = 10;
        } else {
            this.commissionPercentage = 5;
        }
        
        this.commission = (this.amount * this.commissionPercentage) / 100;
        this.landlordAmount = this.amount - this.commission;
    }
    next();
});

// Index for faster queries
paymentSchema.index({ property: 1, tenant: 1, createdAt: -1 });
paymentSchema.index({ landlord: 1, status: 1 });

// Virtual for commission percentage
paymentSchema.virtual('commissionPercentage').get(function() {
    return (this.commission / this.amount) * 100;
});

// Method to check if payment can be refunded
paymentSchema.methods.canBeRefunded = function() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return this.status === 'completed' && this.createdAt > thirtyDaysAgo;
};

>>>>>>> c24ff08aad83fc64379c0b79e46151d3783b8082
module.exports = mongoose.model('Payment', paymentSchema); 