<<<<<<< HEAD
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

=======
const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const Property = require('../models/Property');
const { auth, checkRole } = require('../middleware/auth');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer for image upload
const upload = multer({
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Get all properties with filters
router.get('/', async (req, res) => {
    try {
        const {
            search,
            location,
            type,
            minPrice,
            maxPrice,
            amenities,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            page = 1,
            limit = 10
        } = req.query;

        const query = { status: 'available' };

        // Add search filter
        if (search) {
            query.$text = { $search: search };
        }

        // Add location filter
        if (location) {
            query.location = new RegExp(location, 'i');
        }

        // Add type filter
        if (type) {
            query.type = type;
        }

        // Add price range filter
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }

        // Add amenities filter
        if (amenities) {
            const amenityList = amenities.split(',');
            amenityList.forEach(amenity => {
                query[`features.${amenity}`] = true;
            });
        }

        // Calculate pagination
        const skip = (page - 1) * limit;

        // Execute query with pagination and sorting
        const properties = await Property.find(query)
            .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
            .skip(skip)
            .limit(Number(limit))
            .populate('landlord', 'name email phone')
            .populate('reviews');

        // Get total count for pagination
        const total = await Property.countDocuments(query);

        res.json({
            properties,
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching properties' });
    }
});

// Get single property
router.get('/:id', async (req, res) => {
    try {
        const property = await Property.findById(req.params.id)
            .populate('landlord', 'name email phone')
            .populate('reviews');

        if (!property) {
            return res.status(404).json({ message: 'Property not found' });
        }

        res.json(property);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching property' });
    }
});

// Create new property (landlord only)
router.post('/', auth, checkRole(['landlord']), upload.array('images', 5), async (req, res) => {
    try {
        const propertyData = JSON.parse(req.body.property);
        propertyData.landlord = req.user._id;

        // Upload images to Cloudinary
        const imagePromises = req.files.map(file => 
            cloudinary.uploader.upload(file.buffer.toString('base64'), {
                folder: 'inrent/properties'
            })
        );

        const uploadedImages = await Promise.all(imagePromises);
        propertyData.images = uploadedImages.map(img => ({
            url: img.secure_url,
            public_id: img.public_id
        }));

        const property = new Property(propertyData);
        await property.save();

        res.status(201).json(property);
    } catch (error) {
        res.status(500).json({ message: 'Error creating property' });
    }
});

// Update property (landlord only)
router.put('/:id', auth, checkRole(['landlord']), upload.array('images', 5), async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        
        if (!property) {
            return res.status(404).json({ message: 'Property not found' });
        }

        // Check ownership
        if (property.landlord.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this property' });
        }

        const propertyData = JSON.parse(req.body.property);

        // Handle new images
        if (req.files && req.files.length > 0) {
            // Delete old images from Cloudinary
            const deletePromises = property.images.map(img =>
                cloudinary.uploader.destroy(img.public_id)
            );
            await Promise.all(deletePromises);

            // Upload new images
            const uploadPromises = req.files.map(file =>
                cloudinary.uploader.upload(file.buffer.toString('base64'), {
                    folder: 'inrent/properties'
                })
            );

            const uploadedImages = await Promise.all(uploadPromises);
            propertyData.images = uploadedImages.map(img => ({
                url: img.secure_url,
                public_id: img.public_id
            }));
        }

        // Update property
        Object.assign(property, propertyData);
        await property.save();

        res.json(property);
    } catch (error) {
        res.status(500).json({ message: 'Error updating property' });
    }
});

// Delete property (landlord only)
router.delete('/:id', auth, checkRole(['landlord']), async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        
        if (!property) {
            return res.status(404).json({ message: 'Property not found' });
        }

        // Check ownership
        if (property.landlord.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this property' });
        }

        // Delete images from Cloudinary
        const deletePromises = property.images.map(img =>
            cloudinary.uploader.destroy(img.public_id)
        );
        await Promise.all(deletePromises);

        await property.remove();
        res.json({ message: 'Property deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting property' });
    }
});

// Save/unsave property (student only)
router.post('/:id/save', auth, checkRole(['student']), async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        
        if (!property) {
            return res.status(404).json({ message: 'Property not found' });
        }

        const user = req.user;
        const isSaved = user.savedProperties.includes(property._id);

        if (isSaved) {
            // Unsave property
            user.savedProperties = user.savedProperties.filter(
                id => id.toString() !== property._id.toString()
            );
            property.savedBy = property.savedBy.filter(
                id => id.toString() !== user._id.toString()
            );
        } else {
            // Save property
            user.savedProperties.push(property._id);
            property.savedBy.push(user._id);
        }

        await Promise.all([user.save(), property.save()]);

        res.json({ 
            message: isSaved ? 'Property unsaved' : 'Property saved',
            isSaved: !isSaved
        });
    } catch (error) {
        res.status(500).json({ message: 'Error saving/unsaving property' });
    }
});

>>>>>>> c24ff08aad83fc64379c0b79e46151d3783b8082
module.exports = router; 