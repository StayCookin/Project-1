const { expect } = require('chai');
const mongoose = require('mongoose');
const Review = require('../../models/review');
const User = require('../../models/user');
const Listing = require('../../models/listing');

describe('Review Model Test', () => {
    let testUser;
    let testListing;

    before(async () => {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/inrent_test', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        // Create test user
        testUser = await User.create({
            email: 'test@example.com',
            password: 'password123',
            firstName: 'Test',
            lastName: 'User',
            role: 'student'
        });

        // Create test listing
        testListing = await Listing.create({
            title: 'Test Listing',
            description: 'Test Description',
            price: 1000,
            location: 'Test Location',
            owner: testUser._id
        });
    });

    after(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
    });

    it('should create & save review successfully', async () => {
        const validReview = new Review({
            listing: testListing._id,
            reviewer: testUser._id,
            rating: 5,
            comment: 'Great place to stay!',
            date: new Date()
        });
        const savedReview = await validReview.save();
        
        expect(savedReview._id).to.exist;
        expect(savedReview.listing.toString()).to.equal(testListing._id.toString());
        expect(savedReview.reviewer.toString()).to.equal(testUser._id.toString());
        expect(savedReview.rating).to.equal(5);
        expect(savedReview.comment).to.equal('Great place to stay!');
    });

    it('should fail to save review without required fields', async () => {
        const reviewWithoutRequiredField = new Review({ comment: 'Great place!' });
        let err;
        
        try {
            await reviewWithoutRequiredField.save();
        } catch (error) {
            err = error;
        }
        
        expect(err).to.exist;
        expect(err.errors.listing).to.exist;
        expect(err.errors.reviewer).to.exist;
        expect(err.errors.rating).to.exist;
    });

    it('should fail to save review with invalid rating', async () => {
        const reviewWithInvalidRating = new Review({
            listing: testListing._id,
            reviewer: testUser._id,
            rating: 6,
            comment: 'Great place to stay!',
            date: new Date()
        });
        
        let err;
        try {
            await reviewWithInvalidRating.save();
        } catch (error) {
            err = error;
        }
        
        expect(err).to.exist;
        expect(err.errors.rating).to.exist;
    });

    it('should fail to save review with negative rating', async () => {
        const reviewWithNegativeRating = new Review({
            listing: testListing._id,
            reviewer: testUser._id,
            rating: -1,
            comment: 'Great place to stay!',
            date: new Date()
        });
        
        let err;
        try {
            await reviewWithNegativeRating.save();
        } catch (error) {
            err = error;
        }
        
        expect(err).to.exist;
        expect(err.errors.rating).to.exist;
    });
}); 