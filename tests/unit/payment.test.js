const { expect } = require('chai');
const mongoose = require('mongoose');
const Payment = require('../../models/payment');
const User = require('../../models/user');
const Booking = require('../../models/booking');

describe('Payment Model Test', () => {
    let testUser;
    let testBooking;

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

        // Create test booking
        testBooking = await Booking.create({
            listing: new mongoose.Types.ObjectId(),
            tenant: testUser._id,
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            status: 'pending'
        });
    });

    after(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
    });

    it('should create & save payment successfully', async () => {
        const validPayment = new Payment({
            booking: testBooking._id,
            payer: testUser._id,
            amount: 1000,
            status: 'pending',
            paymentMethod: 'credit_card',
            date: new Date()
        });
        const savedPayment = await validPayment.save();
        
        expect(savedPayment._id).to.exist;
        expect(savedPayment.booking.toString()).to.equal(testBooking._id.toString());
        expect(savedPayment.payer.toString()).to.equal(testUser._id.toString());
        expect(savedPayment.amount).to.equal(1000);
        expect(savedPayment.status).to.equal('pending');
        expect(savedPayment.paymentMethod).to.equal('credit_card');
    });

    it('should fail to save payment without required fields', async () => {
        const paymentWithoutRequiredField = new Payment({ status: 'pending' });
        let err;
        
        try {
            await paymentWithoutRequiredField.save();
        } catch (error) {
            err = error;
        }
        
        expect(err).to.exist;
        expect(err.errors.booking).to.exist;
        expect(err.errors.payer).to.exist;
        expect(err.errors.amount).to.exist;
        expect(err.errors.paymentMethod).to.exist;
    });

    it('should fail to save payment with negative amount', async () => {
        const paymentWithNegativeAmount = new Payment({
            booking: testBooking._id,
            payer: testUser._id,
            amount: -1000,
            status: 'pending',
            paymentMethod: 'credit_card',
            date: new Date()
        });
        
        let err;
        try {
            await paymentWithNegativeAmount.save();
        } catch (error) {
            err = error;
        }
        
        expect(err).to.exist;
        expect(err.errors.amount).to.exist;
    });

    it('should fail to save payment with invalid status', async () => {
        const paymentWithInvalidStatus = new Payment({
            booking: testBooking._id,
            payer: testUser._id,
            amount: 1000,
            status: 'invalid_status',
            paymentMethod: 'credit_card',
            date: new Date()
        });
        
        let err;
        try {
            await paymentWithInvalidStatus.save();
        } catch (error) {
            err = error;
        }
        
        expect(err).to.exist;
        expect(err.errors.status).to.exist;
    });

    it('should fail to save payment with invalid payment method', async () => {
        const paymentWithInvalidMethod = new Payment({
            booking: testBooking._id,
            payer: testUser._id,
            amount: 1000,
            status: 'pending',
            paymentMethod: 'invalid_method',
            date: new Date()
        });
        
        let err;
        try {
            await paymentWithInvalidMethod.save();
        } catch (error) {
            err = error;
        }
        
        expect(err).to.exist;
        expect(err.errors.paymentMethod).to.exist;
    });
}); 