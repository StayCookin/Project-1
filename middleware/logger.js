<<<<<<< HEAD
const winston = require('winston');
const { format } = winston;
const path = require('path');

// Define log format
const logFormat = format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
);

// Create logger instance
const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: logFormat,
    defaultMeta: { service: 'inrent-api' },
    transports: [
        // Write all logs to console
        new winston.transports.Console({
            format: format.combine(
                format.colorize(),
                format.printf(
                    info => `${info.timestamp} ${info.level}: ${info.message}`
                )
            )
        }),
        // Write all logs with level 'error' and below to 'error.log'
        new winston.transports.File({
            filename: path.join(__dirname, '../logs/error.log'),
            level: 'error'
        }),
        // Write all logs with level 'info' and below to 'combined.log'
        new winston.transports.File({
            filename: path.join(__dirname, '../logs/combined.log')
        })
    ]
});

// Create a stream object with a 'write' function that will be used by morgan
logger.stream = {
    write: function(message) {
        logger.info(message.trim());
    }
};

// Request logging middleware
const requestLogger = (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info({
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });
    });

    next();
};

// Error logging middleware
const errorLogger = (err, req, res, next) => {
    logger.error({
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip
    });
    next(err);
};

module.exports = {
    logger,
    requestLogger,
    errorLogger
=======
const winston = require('winston');
const { format } = winston;
const path = require('path');

// Define log format
const logFormat = format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
);

// Create logger instance
const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: logFormat,
    defaultMeta: { service: 'inrent-api' },
    transports: [
        // Write all logs to console
        new winston.transports.Console({
            format: format.combine(
                format.colorize(),
                format.printf(
                    info => `${info.timestamp} ${info.level}: ${info.message}`
                )
            )
        }),
        // Write all logs with level 'error' and below to 'error.log'
        new winston.transports.File({
            filename: path.join(__dirname, '../logs/error.log'),
            level: 'error'
        }),
        // Write all logs with level 'info' and below to 'combined.log'
        new winston.transports.File({
            filename: path.join(__dirname, '../logs/combined.log')
        })
    ]
});

// Create a stream object with a 'write' function that will be used by morgan
logger.stream = {
    write: function(message) {
        logger.info(message.trim());
    }
};

// Request logging middleware
const requestLogger = (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info({
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });
    });

    next();
};

// Error logging middleware
const errorLogger = (err, req, res, next) => {
    logger.error({
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip
    });
    next(err);
};

module.exports = {
    logger,
    requestLogger,
    errorLogger
>>>>>>> c24ff08aad83fc64379c0b79e46151d3783b8082
}; 