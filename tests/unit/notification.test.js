const { expect } = require('chai');
const mongoose = require('mongoose');
const Notification = require('../../models/notification');
const User = require('../../models/user');

describe('Notification Model Test', () => {
    let testUser;

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
    });

    after(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
    });

    it('should create & save notification successfully', async () => {
        const validNotification = new Notification({
            recipient: testUser._id,
            type: 'booking_request',
            message: 'New booking request received',
            read: false,
            date: new Date()
        });
        const savedNotification = await validNotification.save();
        
        expect(savedNotification._id).to.exist;
        expect(savedNotification.recipient.toString()).to.equal(testUser._id.toString());
        expect(savedNotification.type).to.equal('booking_request');
        expect(savedNotification.message).to.equal('New booking request received');
        expect(savedNotification.read).to.be.false;
    });

    it('should fail to save notification without required fields', async () => {
        const notificationWithoutRequiredField = new Notification({ read: false });
        let err;
        
        try {
            await notificationWithoutRequiredField.save();
        } catch (error) {
            err = error;
        }
        
        expect(err).to.exist;
        expect(err.errors.recipient).to.exist;
        expect(err.errors.type).to.exist;
        expect(err.errors.message).to.exist;
    });

    it('should fail to save notification with invalid type', async () => {
        const notificationWithInvalidType = new Notification({
            recipient: testUser._id,
            type: 'invalid_type',
            message: 'Test message',
            read: false,
            date: new Date()
        });
        
        let err;
        try {
            await notificationWithInvalidType.save();
        } catch (error) {
            err = error;
        }
        
        expect(err).to.exist;
        expect(err.errors.type).to.exist;
    });

    it('should mark notification as read', async () => {
        const notification = new Notification({
            recipient: testUser._id,
            type: 'booking_request',
            message: 'Test message',
            read: false,
            date: new Date()
        });
        
        await notification.save();
        notification.read = true;
        await notification.save();
        
        const updatedNotification = await Notification.findById(notification._id);
        expect(updatedNotification.read).to.be.true;
    });
}); 