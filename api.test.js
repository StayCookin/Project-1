const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const User = require('../models/User');
const Property = require('../models/Property');
const Review = require('../models/Review');
const Chat = require('../models/Chat');

let authToken;
let propertyId;
let reviewId;
let chatId;

beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_URI_TEST);
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
});

describe('Authentication Tests', () => {
    test('Should register a new user', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Test User',
                email: 'test@example.com',
                password: 'password123',
                role: 'student'
            });
        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('token');
    });

    test('Should login user', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test@example.com',
                password: 'password123'
            });
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('token');
        authToken = res.body.token;
    });
});

describe('Property Tests', () => {
    test('Should create a new property listing', async () => {
        const res = await request(app)
            .post('/api/properties')
            .set('Authorization', `Bearer ${authToken}`)
            .field('title', 'Test Property')
            .field('description', 'Test Description')
            .field('price', 1000)
            .field('location', 'Test Location')
            .attach('photos', 'tests/fixtures/test-image.jpg');
        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('_id');
        propertyId = res.body._id;
    });

    test('Should get all properties', async () => {
        const res = await request(app)
            .get('/api/properties');
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBeTruthy();
    });

    test('Should get property by ID', async () => {
        const res = await request(app)
            .get(`/api/properties/${propertyId}`);
        expect(res.statusCode).toBe(200);
        expect(res.body._id).toBe(propertyId);
    });
});

describe('Review Tests', () => {
    test('Should create a new review', async () => {
        const res = await request(app)
            .post(`/api/reviews/${propertyId}`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                rating: 4,
                text: 'Great property!'
            });
        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('_id');
        reviewId = res.body._id;
    });

    test('Should get property reviews', async () => {
        const res = await request(app)
            .get(`/api/reviews/property/${propertyId}`);
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBeTruthy();
    });
});

describe('Chat Tests', () => {
    test('Should start a new chat', async () => {
        const res = await request(app)
            .post(`/api/chat/start/${propertyId}`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                message: 'Hi, I am interested in this property'
            });
        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('_id');
        chatId = res.body._id;
    });

    test('Should send a message', async () => {
        const res = await request(app)
            .post(`/api/chat/${chatId}/message`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                message: 'When can I view the property?'
            });
        expect(res.statusCode).toBe(200);
        expect(res.body.messages).toHaveLength(2);
    });

    test('Should get user chats', async () => {
        const res = await request(app)
            .get('/api/chat')
            .set('Authorization', `Bearer ${authToken}`);
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBeTruthy();
    });
}); 