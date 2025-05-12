const express = require('express');
const router = express.Router();
const Viewing = require('../models/Viewing');
const Property = require('../models/Property');
const { auth, checkRole } = require('../middleware/auth');

// Get all viewings for current user
router.get('/', auth, async (req, res) => {
    try {
        const viewings = await Viewing.find({
            $or: [
                { student: req.user._id },
                { landlord: req.user._id }
            ]
        })
        .sort({ scheduledDate: 1 })
        .populate('property', 'title location images')
        .populate('student', 'name email phone')
        .populate('landlord', 'name email phone');

        res.json(viewings);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching viewings' });
    }
});

// Request a viewing (student only)
router.post('/', auth, checkRole(['student']), async (req, res) => {
    try {
        const { propertyId, scheduledDate, notes } = req.body;

        // Verify property exists and is available
        const property = await Property.findById(propertyId);
        if (!property) {
            return res.status(404).json({ message: 'Property not found' });
        }

        if (property.status !== 'available') {
            return res.status(400).json({ message: 'Property is not available for viewing' });
        }

        // Check if viewing already exists
        const existingViewing = await Viewing.findOne({
            property: propertyId,
            student: req.user._id,
            status: { $in: ['pending', 'approved'] }
        });

        if (existingViewing) {
            return res.status(400).json({ message: 'You already have a pending or approved viewing for this property' });
        }

        // Create new viewing request
        const viewing = new Viewing({
            property: propertyId,
            student: req.user._id,
            landlord: property.landlord,
            scheduledDate,
            notes
        });

        await viewing.save();

        // Populate details for response
        await viewing.populate('property', 'title location images');
        await viewing.populate('student', 'name email phone');
        await viewing.populate('landlord', 'name email phone');

        // Emit socket event for real-time notification
        req.app.get('io').to(property.landlord.toString()).emit('newViewingRequest', viewing);

        res.status(201).json(viewing);
    } catch (error) {
        res.status(500).json({ message: 'Error requesting viewing' });
    }
});

// Update viewing status (landlord only)
router.put('/:id/status', auth, checkRole(['landlord']), async (req, res) => {
    try {
        const { status } = req.body;
        const viewing = await Viewing.findById(req.params.id);

        if (!viewing) {
            return res.status(404).json({ message: 'Viewing request not found' });
        }

        // Verify landlord ownership
        if (viewing.landlord.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this viewing' });
        }

        viewing.status = status;
        await viewing.save();

        // Populate details for response
        await viewing.populate('property', 'title location images');
        await viewing.populate('student', 'name email phone');
        await viewing.populate('landlord', 'name email phone');

        // Emit socket event for real-time notification
        req.app.get('io').to(viewing.student.toString()).emit('viewingStatusUpdated', viewing);

        res.json(viewing);
    } catch (error) {
        res.status(500).json({ message: 'Error updating viewing status' });
    }
});

// Cancel viewing (both student and landlord)
router.put('/:id/cancel', auth, async (req, res) => {
    try {
        const viewing = await Viewing.findById(req.params.id);

        if (!viewing) {
            return res.status(404).json({ message: 'Viewing request not found' });
        }

        // Verify user is either student or landlord
        if (viewing.student.toString() !== req.user._id.toString() && 
            viewing.landlord.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to cancel this viewing' });
        }

        viewing.status = 'cancelled';
        await viewing.save();

        // Populate details for response
        await viewing.populate('property', 'title location images');
        await viewing.populate('student', 'name email phone');
        await viewing.populate('landlord', 'name email phone');

        // Emit socket event for real-time notification
        const recipientId = viewing.student.toString() === req.user._id.toString() 
            ? viewing.landlord.toString() 
            : viewing.student.toString();
        req.app.get('io').to(recipientId).emit('viewingCancelled', viewing);

        res.json(viewing);
    } catch (error) {
        res.status(500).json({ message: 'Error cancelling viewing' });
    }
});

// Get viewing statistics (landlord only)
router.get('/stats', auth, checkRole(['landlord']), async (req, res) => {
    try {
        const stats = await Viewing.aggregate([
            {
                $match: {
                    landlord: req.user._id
                }
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching viewing statistics' });
    }
});

module.exports = router; 