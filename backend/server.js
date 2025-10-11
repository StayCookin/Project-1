// backend/server.js
require('dotenv').config();
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { getDatabase } = require('firebase-admin/database');
const express = require('express');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const nodemailer = require('nodemailer');
const express = require('express');
const formData = require('form-data');
const Mailgun = require('mailgun.js');

// Initialize Firebase Admin
try {
  const firebaseConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    databaseURL: process.env.FIREBASE_DATABASE_URL
  };
  if (!firebaseConfig.projectId || !firebaseConfig.privateKey || !firebaseConfig.clientEmail) {
    throw new Error('Missing required Firebase credentials in environment variables');
  }
  initializeApp(firebaseConfig);
  console.log('Firebase Admin initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase Admin:', error.message);
  process.exit(1);
}

const db = getFirestore();
const auth = getAuth();
let realtimeDb;
try {
  if (process.env.FIREBASE_DATABASE_URL) {
    realtimeDb = getDatabase();
    console.log('Realtime Database initialized');
  } else {
    console.warn('FIREBASE_DATABASE_URL not provided; Realtime Database will not be used');
  }
} catch (error) {
  console.warn('Failed to initialize Realtime Database:', error.message);
}
app.get('/api/firebase-config', (req, res) => {
  const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
  };
  
  res.json(firebaseConfig);
});
// Initialize Cloudinary
try {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log('Cloudinary initialized successfully');
} catch (error) {
  console.error('Error initializing Cloudinary:', error.message);
}

// Initialize Nodemailer
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const app = express();
app.use(cors());
app.use(express.json());


const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY,
});

app.post('/api/send-verification', async (req, res) => {
  const { email, firstName, verificationLink} = req.body;

  try { 
    const result = await mg.messages.create(process.env.MAILGUN_DOMAIN, {
      from: 'InRent <postmaster@sandbox047c36c5c1934dd2a1718a82bda6bdc0.mailgun.org>',
      to: [email],
      subject: 'Verify your InRent account',
      html: `<h1>Hi ${firstName}</h1><a href="${verificationLink}">Verify</a>`,
      text: `Hi ${firstName}, verify: ${verificationLink}`
  });
  res.json({ success: true, messageId: result.id});
} catch (error) { res.status(500).json({ error: error.message});}
  });

  app.listen(3000, () => console.log('Server running on port 3000'));
// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
      console.error('No token provided');
      return res.status(401).json({ error: 'No token provided' });
    }
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// Health check route
app.get('/api/health', async (req, res) => {
  try {
    await db.collection('health').doc('test').set({ status: 'ok', timestamp: new Date().toISOString() });
    res.json({ status: 'ok', db: true });
  } catch (error) {
    console.error('Health check error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Send email
app.post('/api/send-email', authenticate, async (req, res) => {
  try {
    const { email, username } = req.body;
    if (!email || !username) {
      return res.status(400).json({ error: 'Email and username required' });
    }
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Welcome to InRent',
      html: `
        <h1>Welcome, ${username}!</h1>
        <p>Thank you for signing up with InRent. Start exploring rentals or create your listings!</p>
        <p><a href="${process.env.CLIENT_URL}">Visit InRent</a></p>
      `
    };
    await transporter.sendMail(mailOptions);
    res.json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Email sending error:', error.message);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Upload image to Cloudinary
app.post('/api/upload-image', authenticate, async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'Image data required' });
    }
    const result = await cloudinary.uploader.upload(image, {
      folder: 'inrent/listings',
      resource_type: 'image'
    });
    res.json({ url: result.secure_url, public_id: result.public_id });
  } catch (error) {
    console.error('Image upload error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Listings endpoints
app.post('/api/listings', authenticate, async (req, res) => {
  try {
    const { title, description, price, location, imageUrl } = req.body;
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'landlord') {
      console.error('Unauthorized listing creation:', req.user.uid);
      return res.status(403).json({ error: 'Only landlords can create listings' });
    }
    const listing = {
      title,
      description,
      price: parseFloat(price),
      currency: 'BWP',
      location,
      imageUrl: imageUrl || '',
      landlordId: req.user.uid,
      createdAt: new Date().toISOString(),
      status: 'active'
    };
    const listingRef = await db.collection('listings').add(listing);
    res.status(201).json({ id: listingRef.id, ...listing });
  } catch (error) {
    console.error('Listing creation error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/listings', async (req, res) => {
  try {
    const { location, minPrice, maxPrice } = req.query;
    let query = db.collection('listings').where('status', '==', 'active');
    if (location) query = query.where('location', '==', location);
    if (minPrice) query = query.where('price', '>=', parseFloat(minPrice));
    if (maxPrice) query = query.where('price', '<=', parseFloat(maxPrice));
    const snapshot = await query.get();
    const listings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(listings);
  } catch (error) {
    console.error('Listings fetch error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Error handling
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});