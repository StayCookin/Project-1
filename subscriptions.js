const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const paymentGateway = require('../services/paymentGateway');
const monitoringService = require('../services/monitoringService');

// @route   POST api/subscriptions/premium
// @desc    Subscribe to premium plan
// @access  Private (Landlords only)
router.post('/premium', [
    auth,
    [
        check('paymentMethod', 'Payment method is required').notEmpty()
    ]
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        // Check if user is a landlord
        const user = await User.findById(req.user.id);
        if (user.role !== 'landlord') {
            return res.status(403).json({ msg: 'Only landlords can subscribe to premium' });
        }

        // Check if already subscribed
        let subscription = await Subscription.findOne({
            landlord: req.user.id,
            status: 'active'
        });

        if (subscription) {
            return res.status(400).json({ msg: 'Already subscribed to premium' });
        }

        // Process payment
        const paymentResponse = await paymentGateway.initiatePayment(
            10, // $10 USD
            'Premium Subscription',
            user.email,
            `${process.env.CLIENT_URL}/subscriptions/confirm`
        );

        if (!paymentResponse.success) {
            return res.status(400).json({ msg: 'Payment failed' });
        }

        // Create subscription
        subscription = new Subscription({
            landlord: req.user.id,
            plan: 'premium',
            paymentMethod: req.body.paymentMethod,
            features: {
                priorityListing: true,
                analytics: true,
                premiumSupport: true
            }
        });

        await subscription.save();

        // Log subscription
        monitoringService.logAuditTrail(
            'subscription_created',
            req.user.id,
            { plan: 'premium', amount: 10 }
        );

        res.json({
            subscription,
            paymentUrl: paymentResponse.paymentUrl
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// @route   GET api/subscriptions/status
// @desc    Get subscription status
// @access  Private
router.get('/status', auth, async (req, res) => {
    try {
        const subscription = await Subscription.findOne({
            landlord: req.user.id,
            status: 'active'
        });

        res.json({
            isSubscribed: !!subscription,
            subscription
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// @route   POST api/subscriptions/cancel
// @desc    Cancel subscription
// @access  Private
router.post('/cancel', auth, async (req, res) => {
    try {
        const subscription = await Subscription.findOne({
            landlord: req.user.id,
            status: 'active'
        });

        if (!subscription) {
            return res.status(404).json({ msg: 'No active subscription found' });
        }

        await subscription.cancel();

        // Log cancellation
        monitoringService.logAuditTrail(
            'subscription_cancelled',
            req.user.id,
            { subscriptionId: subscription._id }
        );

        res.json({ msg: 'Subscription cancelled' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// @route   POST api/subscriptions/renew
// @desc    Renew subscription
// @access  Private
router.post('/renew', auth, async (req, res) => {
    try {
        const subscription = await Subscription.findOne({
            landlord: req.user.id,
            status: { $in: ['expired', 'cancelled'] }
        });

        if (!subscription) {
            return res.status(404).json({ msg: 'No subscription found' });
        }

        // Process renewal payment
        const user = await User.findById(req.user.id);
        const paymentResponse = await paymentGateway.initiatePayment(
            10,
            'Premium Subscription Renewal',
            user.email,
            `${process.env.CLIENT_URL}/subscriptions/confirm`
        );

        if (!paymentResponse.success) {
            return res.status(400).json({ msg: 'Renewal payment failed' });
        }

        subscription.status = 'active';
        subscription.autoRenew = true;
        await subscription.renew();

        // Log renewal
        monitoringService.logAuditTrail(
            'subscription_renewed',
            req.user.id,
            { subscriptionId: subscription._id }
        );

        res.json({
            subscription,
            paymentUrl: paymentResponse.paymentUrl
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server error' });
    }
});

module.exports = router; 