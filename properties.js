const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const Property = require('../models/Property');

// @route   POST api/properties
// @desc    Create a new property listing
// @access  Private (Landlords only)
router.post('/',
    auth,
    upload.fields([
        { name: 'photos', maxCount: 5 },
        { name: 'documents', maxCount: 1 }
    ]),
    [
        check('title', 'Title is required').not().isEmpty(),
        check('description', 'Description is required').not().isEmpty(),
        check('type', 'Valid property type is required').isIn(['apartment', 'house', 'commercial', 'student']),
        check('price', 'Price is required').isNumeric(),
        check('location', 'Location is required').not().isEmpty(),
        check('ratings.condition', 'Condition rating is required').isInt({ min: 1, max: 10 }),
        check('ratings.safety', 'Safety rating is required').isInt({ min: 1, max: 10 })
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            // Check if user is landlord
            if (req.user.role !== 'landlord') {
                return res.status(403).json({ msg: 'Only landlords can create listings' });
            }

            // Check if landlord has free listings
            if (req.user.freeListings <= 0) {
                return res.status(403).json({ msg: 'No free listings remaining' });
            }

            // Create property
            const property = new Property({
                owner: req.user.id,
                title: req.body.title,
                description: req.body.description,
                type: req.body.type,
                price: req.body.price,
                location: req.body.location,
                amenities: req.body.amenities,
                ratings: req.body.ratings,
                photos: req.files.photos.map(file => file.filename),
                documents: {
                    titleDeed: req.files.documents[0].filename
                }
            });

            await property.save();

            // Decrement free listings
            req.user.freeListings--;
            await req.user.save();

            res.json(property);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server error');
        }
    }
);

// @route   GET api/properties
// @desc    Get all properties
// @access  Public
router.get('/', async (req, res) => {
    try {
        const properties = await Property.find({ status: 'available', verified: true })
            .populate('owner', ['name', 'phone', 'email'])
            .sort('-createdAt');
        res.json(properties);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET api/properties/:id
// @desc    Get property by ID
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const property = await Property.findById(req.params.id)
            .populate('owner', ['name', 'phone', 'email'])
            .populate('reviews');
        
        if (!property) {
            return res.status(404).json({ msg: 'Property not found' });
        }

        res.json(property);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Property not found' });
        }
        res.status(500).send('Server error');
    }
});

// @route   PUT api/properties/:id
// @desc    Update property
// @access  Private (Owner only)
router.put('/:id', auth, async (req, res) => {
    try {
        let property = await Property.findById(req.params.id);
        
        if (!property) {
            return res.status(404).json({ msg: 'Property not found' });
        }

        // Make sure user owns property
        if (property.owner.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        property = await Property.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        );

        res.json(property);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   DELETE api/properties/:id
// @desc    Delete property
// @access  Private (Owner only)
router.delete('/:id', auth, async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        
        if (!property) {
            return res.status(404).json({ msg: 'Property not found' });
        }

        // Make sure user owns property
        if (property.owner.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        await property.remove();
        res.json({ msg: 'Property removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router; 