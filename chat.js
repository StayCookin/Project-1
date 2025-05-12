const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Chat = require('../models/Chat');
const User = require('../models/User');

// @route   POST api/chat/start/:propertyId
// @desc    Start a new chat about a property
// @access  Private
router.post('/start/:propertyId', auth, async (req, res) => {
    try {
        const property = await Property.findById(req.params.propertyId)
            .populate('owner');

        if (!property) {
            return res.status(404).json({ msg: 'Property not found' });
        }

        // Check if chat already exists
        let chat = await Chat.findOne({
            property: req.params.propertyId,
            participants: { $all: [req.user.id, property.owner._id] }
        });

        if (chat) {
            return res.json(chat);
        }

        // Create new chat
        chat = new Chat({
            participants: [req.user.id, property.owner._id],
            property: req.params.propertyId,
            messages: [{
                sender: req.user.id,
                content: req.body.message || 'Hi, I am interested in this property.'
            }]
        });

        await chat.save();
        res.json(chat);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/chat/:chatId/message
// @desc    Send a message in a chat
// @access  Private
router.post('/:chatId/message', auth, async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.chatId);

        if (!chat) {
            return res.status(404).json({ msg: 'Chat not found' });
        }

        // Check if user is participant
        if (!chat.participants.includes(req.user.id)) {
            return res.status(403).json({ msg: 'Not authorized to access this chat' });
        }

        // Add message
        chat.messages.push({
            sender: req.user.id,
            content: req.body.message
        });

        await chat.save();
        res.json(chat);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET api/chat
// @desc    Get all chats for user
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const chats = await Chat.find({ participants: req.user.id })
            .populate('participants', ['name'])
            .populate('property', ['title', 'photos'])
            .sort('-lastMessage');
        res.json(chats);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET api/chat/:chatId
// @desc    Get chat by ID
// @access  Private
router.get('/:chatId', auth, async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.chatId)
            .populate('participants', ['name'])
            .populate('property', ['title', 'photos']);

        if (!chat) {
            return res.status(404).json({ msg: 'Chat not found' });
        }

        // Check if user is participant
        if (!chat.participants.includes(req.user.id)) {
            return res.status(403).json({ msg: 'Not authorized to access this chat' });
        }

        res.json(chat);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   PUT api/chat/:chatId/read
// @desc    Mark chat messages as read
// @access  Private
router.put('/:chatId/read', auth, async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.chatId);

        if (!chat) {
            return res.status(404).json({ msg: 'Chat not found' });
        }

        // Check if user is participant
        if (!chat.participants.includes(req.user.id)) {
            return res.status(403).json({ msg: 'Not authorized to access this chat' });
        }

        // Mark all messages from other user as read
        chat.messages.forEach(message => {
            if (message.sender.toString() !== req.user.id) {
                message.read = true;
            }
        });

        await chat.save();
        res.json(chat);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   PUT api/chat/:chatId/archive
// @desc    Archive a chat
// @access  Private
router.put('/:chatId/archive', auth, async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.chatId);

        if (!chat) {
            return res.status(404).json({ msg: 'Chat not found' });
        }

        // Check if user is participant
        if (!chat.participants.includes(req.user.id)) {
            return res.status(403).json({ msg: 'Not authorized to access this chat' });
        }

        chat.status = 'archived';
        await chat.save();
        res.json(chat);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router; 