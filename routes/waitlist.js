const express = require('express');
const router = express.Router();
const Waitlist = require('../models/Waitlist');

// Add to waitlist
router.post('/join', async (req, res) => {
    try {
        const { email, firstName, lastName, institution, studentId, phoneNumber } = req.body;

        // Check if email already exists
        const existingEntry = await Waitlist.findOne({ where: { email } });
        if (existingEntry) {
            return res.status(400).json({
                success: false,
                message: 'You are already on the waitlist!'
            });
        }

        // Create new waitlist entry
        const waitlistEntry = await Waitlist.create({
            email,
            firstName,
            lastName,
            institution,
            studentId,
            phoneNumber
        });

        res.status(201).json({
            success: true,
            message: 'Successfully joined the waitlist!',
            data: waitlistEntry
        });
    } catch (error) {
        console.error('Waitlist error:', error);
        res.status(500).json({
            success: false,
            message: 'Error joining waitlist',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get waitlist status (for admin use)
router.get('/status', async (req, res) => {
    try {
        const { email } = req.query;
        
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        const entry = await Waitlist.findOne({ where: { email } });
        
        if (!entry) {
            return res.status(404).json({
                success: false,
                message: 'Email not found in waitlist'
            });
        }

        res.json({
            success: true,
            data: {
                status: entry.status,
                position: await Waitlist.count({ where: { status: 'pending' } })
            }
        });
    } catch (error) {
        console.error('Waitlist status error:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking waitlist status',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router; 