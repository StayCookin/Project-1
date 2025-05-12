const { expect } = require('chai');
const mongoose = require('mongoose');
const Listing = require('../../models/listing');

describe('Listing Model Test', () => {
    before(async () => {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/inrent_test', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
    });

    after(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
    });

    it('should create & save listing successfully', async () => {
        const validListing = new Listing({
            title: 'Test Listing',
            description: 'Test Description',
            price: 1000,
            location: 'Test Location',
            amenities: ['wifi', 'parking'],
            images: ['test.jpg'],
            owner: new mongoose.Types.ObjectId()
        });
        const savedListing = await validListing.save();
        
        expect(savedListing._id).to.exist;
        expect(savedListing.title).to.equal('Test Listing');
        expect(savedListing.price).to.equal(1000);
    });

    it('should fail to save listing without required fields', async () => {
        const listingWithoutRequiredField = new Listing({ title: 'Test Listing' });
        let err;
        
        try {
            await listingWithoutRequiredField.save();
        } catch (error) {
            err = error;
        }
        
        expect(err).to.exist;
        expect(err.errors.price).to.exist;
        expect(err.errors.location).to.exist;
    });

    it('should fail to save listing with invalid price', async () => {
        const listingWithInvalidPrice = new Listing({
            title: 'Test Listing',
            description: 'Test Description',
            price: -1000,
            location: 'Test Location',
            owner: new mongoose.Types.ObjectId()
        });
        
        let err;
        try {
            await listingWithInvalidPrice.save();
        } catch (error) {
            err = error;
        }
        
        expect(err).to.exist;
        expect(err.errors.price).to.exist;
    });
}); 