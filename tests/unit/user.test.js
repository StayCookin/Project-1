const { expect } = require('chai');
const mongoose = require('mongoose');
const User = require('../../models/user');
const bcrypt = require('bcryptjs');

describe('User Model Test', () => {
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

    it('should create & save user successfully', async () => {
        const validUser = new User({
            email: 'test@example.com',
            password: 'password123',
            firstName: 'Test',
            lastName: 'User',
            role: 'student'
        });
        const savedUser = await validUser.save();
        
        expect(savedUser._id).to.exist;
        expect(savedUser.email).to.equal('test@example.com');
        expect(savedUser.firstName).to.equal('Test');
        expect(savedUser.role).to.equal('student');
    });

    it('should fail to save user without required fields', async () => {
        const userWithoutRequiredField = new User({ email: 'test@example.com' });
        let err;
        
        try {
            await userWithoutRequiredField.save();
        } catch (error) {
            err = error;
        }
        
        expect(err).to.exist;
        expect(err.errors.password).to.exist;
        expect(err.errors.firstName).to.exist;
        expect(err.errors.lastName).to.exist;
    });

    it('should fail to save user with invalid email', async () => {
        const userWithInvalidEmail = new User({
            email: 'invalid-email',
            password: 'password123',
            firstName: 'Test',
            lastName: 'User',
            role: 'student'
        });
        
        let err;
        try {
            await userWithInvalidEmail.save();
        } catch (error) {
            err = error;
        }
        
        expect(err).to.exist;
        expect(err.errors.email).to.exist;
    });

    it('should hash password before saving', async () => {
        const user = new User({
            email: 'test2@example.com',
            password: 'password123',
            firstName: 'Test',
            lastName: 'User',
            role: 'student'
        });
        
        await user.save();
        expect(user.password).to.not.equal('password123');
        
        const isMatch = await bcrypt.compare('password123', user.password);
        expect(isMatch).to.be.true;
    });
}); 