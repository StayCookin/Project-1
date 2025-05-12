<<<<<<< HEAD
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss-clean');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

// Specific limiter for login attempts
const loginLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 5, // start blocking after 5 requests
    message: 'Too many login attempts, please try again after an hour'
});

// Data protection middleware
const securityMiddleware = (app) => {
    // Set security headers
    app.use(helmet());
    
    // Prevent XSS attacks
    app.use(xss());
    
    // Sanitize data
    app.use(mongoSanitize());
    
    // Prevent HTTP Parameter Pollution
    app.use(hpp());
    
    // CORS configuration
    app.use(cors({
        origin: process.env.CLIENT_URL,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Content Security Policy
    app.use(helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", process.env.API_URL],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"]
        }
    }));

    // GDPR Cookie Consent
    app.use((req, res, next) => {
        res.cookie('cookieConsent', 'pending', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 365 * 24 * 60 * 60 * 1000 // 1 year
        });
        next();
    });

    // PCI DSS Compliance - Remove sensitive data
    app.use((req, res, next) => {
        if (req.body) {
            delete req.body.cardNumber;
            delete req.body.cvv;
            delete req.body.expiryDate;
        }
        next();
    });

    // Data retention middleware
    app.use((req, res, next) => {
        // Add retention policy headers
        res.set('X-Data-Retention-Period', '2 years');
        res.set('X-Data-Usage-Policy', 'payment-processing-only');
        next();
    });
};

=======
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss-clean');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

// Specific limiter for login attempts
const loginLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 5, // start blocking after 5 requests
    message: 'Too many login attempts, please try again after an hour'
});

// Data protection middleware
const securityMiddleware = (app) => {
    // Set security headers
    app.use(helmet());
    
    // Prevent XSS attacks
    app.use(xss());
    
    // Sanitize data
    app.use(mongoSanitize());
    
    // Prevent HTTP Parameter Pollution
    app.use(hpp());
    
    // CORS configuration
    app.use(cors({
        origin: process.env.CLIENT_URL,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Content Security Policy
    app.use(helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", process.env.API_URL],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"]
        }
    }));

    // GDPR Cookie Consent
    app.use((req, res, next) => {
        res.cookie('cookieConsent', 'pending', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 365 * 24 * 60 * 60 * 1000 // 1 year
        });
        next();
    });

    // PCI DSS Compliance - Remove sensitive data
    app.use((req, res, next) => {
        if (req.body) {
            delete req.body.cardNumber;
            delete req.body.cvv;
            delete req.body.expiryDate;
        }
        next();
    });

    // Data retention middleware
    app.use((req, res, next) => {
        // Add retention policy headers
        res.set('X-Data-Retention-Period', '2 years');
        res.set('X-Data-Usage-Policy', 'payment-processing-only');
        next();
    });
};

>>>>>>> c24ff08aad83fc64379c0b79e46151d3783b8082
module.exports = securityMiddleware; 