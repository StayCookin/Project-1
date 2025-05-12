const { expect } = require('chai');
const mongoose = require('mongoose');
const Message = require('../../models/message');
const User = require('../../models/user');

describe('Message Model Test', () => {
    let testUser1;
    let testUser2;

    before(async () => {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/inrent_test', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        // Create test users
        testUser1 = await User.create({
            email: 'test1@example.com',
            password: 'password123',
            firstName: 'Test',
            lastName: 'User1',
            role: 'student'
        });

        testUser2 = await User.create({
            email: 'test2@example.com',
            password: 'password123',
            firstName: 'Test',
            lastName: 'User2',
            role: 'landlord'
        });
    });

    after(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
    });

    it('should create & save message successfully', async () => {
        const validMessage = new Message({
            sender: testUser1._id,
            recipient: testUser2._id,
            content: 'Hello, I am interested in your property.',
            read: false,
            date: new Date()
        });
        const savedMessage = await validMessage.save();
        
        expect(savedMessage._id).to.exist;
        expect(savedMessage.sender.toString()).to.equal(testUser1._id.toString());
        expect(savedMessage.recipient.toString()).to.equal(testUser2._id.toString());
        expect(savedMessage.content).to.equal('Hello, I am interested in your property.');
        expect(savedMessage.read).to.be.false;
    });

    it('should fail to save message without required fields', async () => {
        const messageWithoutRequiredField = new Message({ read: false });
        let err;
        
        try {
            await messageWithoutRequiredField.save();
        } catch (error) {
            err = error;
        }
        
        expect(err).to.exist;
        expect(err.errors.sender).to.exist;
        expect(err.errors.recipient).to.exist;
        expect(err.errors.content).to.exist;
    });

    it('should fail to save message with empty content', async () => {
        const messageWithEmptyContent = new Message({
            sender: testUser1._id,
            recipient: testUser2._id,
            content: '',
            read: false,
            date: new Date()
        });
        
        let err;
        try {
            await messageWithEmptyContent.save();
        } catch (error) {
            err = error;
        }
        
        expect(err).to.exist;
        expect(err.errors.content).to.exist;
    });

    it('should mark message as read', async () => {
        const message = new Message({
            sender: testUser1._id,
            recipient: testUser2._id,
            content: 'Test message',
            read: false,
            date: new Date()
        });
        
        await message.save();
        message.read = true;
        await message.save();
        
        const updatedMessage = await Message.findById(message._id);
        expect(updatedMessage.read).to.be.true;
    });

    it('should not allow sender and recipient to be the same user', async () => {
        const messageWithSameUsers = new Message({
            sender: testUser1._id,
            recipient: testUser1._id,
            content: 'Test message',
            read: false,
            date: new Date()
        });
        
        let err;
        try {
            await messageWithSameUsers.save();
        } catch (error) {
            err = error;
        }
        
        expect(err).to.exist;
        expect(err.errors.recipient).to.exist;
    });
}); 