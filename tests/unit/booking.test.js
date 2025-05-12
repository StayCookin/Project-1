const { expect } = require('chai');
const mongoose = require('mongoose');
const Booking = require('../../models/booking');
const User = require('../../models/user');
const Listing = require('../../models/listing');

describe('Booking Model Test', () => {
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

    it('should create & save booking successfully', async () => {
        const validBooking = new Booking({
            listing: testListing._id,
            tenant: testUser._id,
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            status: 'pending'
        });
        const savedBooking = await validBooking.save();
        
        expect(savedBooking._id).to.exist;
        expect(savedBooking.listing.toString()).to.equal(testListing._id.toString());
        expect(savedBooking.tenant.toString()).to.equal(testUser._id.toString());
        expect(savedBooking.status).to.equal('pending');
    });

    it('should fail to save booking without required fields', async () => {
        const bookingWithoutRequiredField = new Booking({ status: 'pending' });
        let err;
        
        try {
            await bookingWithoutRequiredField.save();
        } catch (error) {
            err = error;
        }
        
        expect(err).to.exist;
        expect(err.errors.listing).to.exist;
        expect(err.errors.tenant).to.exist;
        expect(err.errors.startDate).to.exist;
        expect(err.errors.endDate).to.exist;
    });

    it('should fail to save booking with end date before start date', async () => {
        const bookingWithInvalidDates = new Booking({
            listing: testListing._id,
            tenant: testUser._id,
            startDate: new Date(),
            endDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
            status: 'pending'
        });
        
        let err;
        try {
            await bookingWithInvalidDates.save();
        } catch (error) {
            err = error;
        }
        
        expect(err).to.exist;
        expect(err.errors.endDate).to.exist;
    });

    it('should fail to save booking with invalid status', async () => {
        const bookingWithInvalidStatus = new Booking({
            listing: testListing._id,
            tenant: testUser._id,
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            status: 'invalid_status'
        });
        
        let err;
        try {
            await bookingWithInvalidStatus.save();
        } catch (error) {
            err = error;
        }
        
        expect(err).to.exist;
        expect(err.errors.status).to.exist;
    });
}); 