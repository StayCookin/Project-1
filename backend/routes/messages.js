const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Property = require('../models/Property');
const { auth } = require('../middleware/auth');

// Get all conversations for current user
router.get('/conversations', auth, async (req, res) => {
    try {
        const conversations = await Message.aggregate([
            {
                $match: {
                    $or: [
                        { sender: req.user._id },
                        { receiver: req.user._id }
                    ]
                }
            },
            {
                $sort: { createdAt: -1 }
            },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $eq: ['$sender', req.user._id] },
                            '$receiver',
                            '$sender'
                        ]
                    },
                    lastMessage: { $first: '$$ROOT' },
                    unreadCount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ['$receiver', req.user._id] },
                                        { $eq: ['$isRead', false] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            {
                $unwind: '$user'
            },
            {
                $project: {
                    _id: 1,
                    lastMessage: 1,
                    unreadCount: 1,
                    'user.name': 1,
                    'user.email': 1,
                    'user.profilePicture': 1
                }
            }
        ]);

        res.json(conversations);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching conversations' });
    }
});

// Get messages between two users for a specific property
router.get('/:propertyId/:userId', auth, async (req, res) => {
    try {
        const messages = await Message.find({
            property: req.params.propertyId,
            $or: [
                { sender: req.user._id, receiver: req.params.userId },
                { sender: req.params.userId, receiver: req.user._id }
            ]
        })
        .sort({ createdAt: 1 })
        .populate('sender', 'name email profilePicture')
        .populate('receiver', 'name email profilePicture');

        // Mark messages as read
        await Message.updateMany(
            {
                property: req.params.propertyId,
                sender: req.params.userId,
                receiver: req.user._id,
                isRead: false
            },
            { isRead: true }
        );

        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching messages' });
    }
});

// Send a new message
router.post('/', auth, async (req, res) => {
    try {
        const { receiverId, propertyId, content } = req.body;

        // Verify property exists
        const property = await Property.findById(propertyId);
        if (!property) {
            return res.status(404).json({ message: 'Property not found' });
        }

        // Create new message
        const message = new Message({
            sender: req.user._id,
            receiver: receiverId,
            property: propertyId,
            content
        });

        await message.save();

        // Populate sender and receiver details
        await message.populate('sender', 'name email profilePicture');
        await message.populate('receiver', 'name email profilePicture');

        // Emit socket event for real-time updates
        req.app.get('io').to(propertyId).emit('newMessage', message);

        res.status(201).json(message);
    } catch (error) {
        res.status(500).json({ message: 'Error sending message' });
    }
});

// Mark messages as read
router.put('/read/:propertyId/:userId', auth, async (req, res) => {
    try {
        await Message.updateMany(
            {
                property: req.params.propertyId,
                sender: req.params.userId,
                receiver: req.user._id,
                isRead: false
            },
            { isRead: true }
        );

        res.json({ message: 'Messages marked as read' });
    } catch (error) {
        res.status(500).json({ message: 'Error marking messages as read' });
    }
});

// Get unread message count
router.get('/unread/count', auth, async (req, res) => {
    try {
        const count = await Message.countDocuments({
            receiver: req.user._id,
            isRead: false
        });

        res.json({ count });
    } catch (error) {
        res.status(500).json({ message: 'Error getting unread count' });
    }
});

module.exports = router; 