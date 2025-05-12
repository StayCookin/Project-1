const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Payment = require('../models/Payment');
const Property = require('../models/Property');
const User = require('../models/User');
const paymentGateway = require('../services/paymentGateway');
const notificationService = require('../services/notificationService');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Apply security middleware
router.use(helmet());

// Rate limiting for payment endpoints
const paymentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 payment requests per window
    message: 'Too many payment attempts, please try again later'
});

// Webhook IP whitelist
const ALLOWED_IPS = process.env.PAYGATE_WEBHOOK_IPS?.split(',') || [];
const validateWebhookIP = (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    if (!ALLOWED_IPS.includes(clientIP)) {
        console.error(`Unauthorized webhook attempt from IP: ${clientIP}`);
        return res.status(403).json({ error: 'Unauthorized' });
    }
    next();
};

// Calculate commission based on rent amount
const calculateCommission = (rentAmount) => {
    if (rentAmount >= 2500) {
        return rentAmount * 0.15; // 15%
    } else if (rentAmount >= 1500) {
        return rentAmount * 0.10; // 10%
    } else if (rentAmount >= 1000) {
        return rentAmount * 0.05; // 5%
    }
    return 0;
};

// @route   POST api/payments/process
// @desc    Process rental payment and commission
// @access  Private
router.post('/process', auth, async (req, res) => {
    try {
        const { propertyId, amount, paymentMethod } = req.body;

        // Validate property and ownership
        const property = await Property.findById(propertyId)
            .populate('owner', 'bankDetails');

        if (!property) {
            return res.status(404).json({ msg: 'Property not found' });
        }

        // Calculate commission
        const commission = calculateCommission(amount);
        const landlordAmount = amount - commission;

        // Create payment record
        const payment = new Payment({
            property: propertyId,
            tenant: req.user.id,
            landlord: property.owner._id,
            amount: amount,
            commission: commission,
            landlordAmount: landlordAmount,
            paymentMethod: paymentMethod,
            status: 'pending'
        });

        // Process payment through payment gateway
        try {
            // TODO: Integrate with payment gateway (e.g., Stripe, PayFast)
            // const paymentResult = await processPayment(paymentMethod, amount);
            
            payment.status = 'completed';
            payment.transactionId = 'TEMP_ID'; // Replace with actual transaction ID
            
            // Transfer funds to landlord (minus commission)
            // await transferToLandlord(property.owner.bankDetails, landlordAmount);
            
            await payment.save();

            res.json({
                success: true,
                payment: {
                    id: payment._id,
                    amount: amount,
                    commission: commission,
                    landlordAmount: landlordAmount,
                    status: 'completed',
                    date: payment.createdAt
                }
            });
        } catch (error) {
            payment.status = 'failed';
            await payment.save();
            throw error;
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET api/payments/history
// @desc    Get payment history
// @access  Private
router.get('/history', [
    auth,
    rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 100 // Limit each IP to 100 requests per hour
    })
], async (req, res) => {
    try {
        const payments = await Payment.find({
            $or: [
                { tenant: req.user.id },
                { landlord: req.user.id }
            ]
        })
        .populate('property', 'title location')
        .populate('tenant', 'name email')
        .populate('landlord', 'name email')
        .sort('-createdAt');

        res.json(payments);
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// @route   GET api/payments/stats
// @desc    Get payment statistics
// @access  Private (Landlords only)
router.get('/stats', auth, async (req, res) => {
    try {
        // Verify user is a landlord
        const user = await User.findById(req.user.id);
        if (user.role !== 'landlord') {
            return res.status(403).json({ msg: 'Not authorized' });
        }

        const stats = await Payment.aggregate([
            { $match: { landlord: req.user.id, status: 'completed' } },
            {
                $group: {
                    _id: null,
                    totalPayments: { $sum: 1 },
                    totalAmount: { $sum: '$amount' },
                    totalCommission: { $sum: '$commission' },
                    netAmount: { $sum: '$landlordAmount' }
                }
            }
        ]);

        res.json(stats[0] || {
            totalPayments: 0,
            totalAmount: 0,
            totalCommission: 0,
            netAmount: 0
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/payments/initiate
// @desc    Initiate a new payment
// @access  Private
router.post('/initiate', [
    auth,
    paymentLimiter,
    [
        check('propertyId', 'Property ID is required').isMongoId(),
        check('amount', 'Amount must be a positive number').isFloat({ min: 0.01 }),
        check('paymentMethod', 'Valid payment method is required').isIn(['card', 'bank_transfer'])
    ]
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { propertyId, amount, paymentMethod } = req.body;
        const property = await Property.findById(propertyId).populate('owner');

        if (!property) {
            return res.status(404).json({ msg: 'Property not found' });
        }

        // Create payment record
        const payment = new Payment({
            tenant: req.user.id,
            landlord: property.owner._id,
            property: propertyId,
            amount,
            paymentMethod,
            dueDate: property.nextPaymentDate
        });

        // Calculate commission and landlord amount
        await payment.save();

        // Initiate payment with PayGate
        const paymentResponse = await paymentGateway.initiatePayment(
            amount,
            `Rent payment for ${property.title}`,
            req.user.email,
            `${process.env.CLIENT_URL}/payments/confirm`
        );

        if (!paymentResponse.success) {
            payment.status = 'failed';
            await payment.save();
            return res.status(400).json({ msg: 'Payment initiation failed' });
        }

        payment.paymentReference = paymentResponse.reference;
        await payment.save();

        res.json({
            success: true,
            paymentUrl: paymentResponse.paymentUrl,
            reference: paymentResponse.reference
        });
    } catch (err) {
        console.error('Payment initiation error:', err);
        res.status(500).json({ msg: 'Payment processing error' }); // Generic error message
    }
});

// @route   POST api/payments/webhook
// @desc    Handle payment webhook from PayGate
// @access  Public (IP restricted)
router.post('/webhook', [validateWebhookIP], async (req, res) => {
    try {
        const { REFERENCE, TRANSACTION_STATUS, TRANSACTION_ID, CHECKSUM } = req.body;

        // Verify webhook data integrity
        if (!paymentGateway.verifyChecksum(req.body, CHECKSUM)) {
            console.error('Invalid webhook checksum');
            return res.status(400).json({ error: 'Invalid checksum' });
        }

        const payment = await Payment.findOne({ paymentReference: REFERENCE });
        if (!payment) {
            return res.status(404).json({ msg: 'Payment not found' });
        }

        if (TRANSACTION_STATUS === '1') { // Approved
            payment.status = 'completed';
            payment.transactionId = TRANSACTION_ID;
            await payment.save();

            // Send notifications
            await notificationService.sendPaymentConfirmation(payment);
            await notificationService.sendLandlordPaymentNotification(payment);

            // Update property next payment date
            const property = await Property.findById(payment.property);
            if (property) {
                const nextDate = new Date(property.nextPaymentDate);
                nextDate.setMonth(nextDate.getMonth() + 1);
                property.nextPaymentDate = nextDate;
                await property.save();
            }
        } else {
            payment.status = 'failed';
            await payment.save();
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Webhook processing error:', err);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// @route   POST api/payments/refund/:id
// @desc    Refund a payment
// @access  Private (Admin only)
router.post('/refund/:id', [
    auth,
    check('id', 'Invalid payment ID').isMongoId(),
    check('reason', 'Reason for refund is required').trim().notEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const payment = await Payment.findById(req.params.id);
        if (!payment) {
            return res.status(404).json({ msg: 'Payment not found' });
        }

        if (!payment.canBeRefunded()) {
            return res.status(400).json({ msg: 'Payment cannot be refunded' });
        }

        const refundResponse = await paymentGateway.processRefund(
            payment.transactionId,
            payment.amount,
            req.body.reason
        );

        if (!refundResponse.success) {
            return res.status(400).json({ msg: 'Refund failed' });
        }

        payment.status = 'refunded';
        payment.metadata.set('refundReason', req.body.reason);
        payment.metadata.set('refundId', refundResponse.refundId);
        await payment.save();

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server error' });
    }
});

module.exports = router; 