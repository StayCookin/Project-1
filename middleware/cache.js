<<<<<<< HEAD
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

// Cache middleware
const cache = (duration) => {
    return async (req, res, next) => {
        if (req.method !== 'GET') {
            return next();
        }

        const key = `cache:${req.originalUrl}`;

        try {
            const cachedResponse = await redis.get(key);
            
            if (cachedResponse) {
                return res.json(JSON.parse(cachedResponse));
            }

            // Store original send
            const originalSend = res.json;
            
            // Override res.json method
            res.json = function(body) {
                redis.setex(key, duration, JSON.stringify(body));
                originalSend.call(this, body);
            };

            next();
        } catch (error) {
            console.error('Cache error:', error);
            next();
        }
    };
};

// Clear cache by pattern
const clearCache = async (pattern) => {
    try {
        const keys = await redis.keys(`cache:${pattern}`);
        if (keys.length > 0) {
            await redis.del(keys);
        }
    } catch (error) {
        console.error('Clear cache error:', error);
    }
};

// Cache invalidation middleware
const invalidateCache = (pattern) => {
    return async (req, res, next) => {
        // Store original end
        const originalEnd = res.end;

        // Override end method
        res.end = async function() {
            if (res.statusCode < 400) {
                await clearCache(pattern);
            }
            originalEnd.apply(this, arguments);
        };

        next();
    };
};

module.exports = {
    cache,
    clearCache,
    invalidateCache
=======
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

// Cache middleware
const cache = (duration) => {
    return async (req, res, next) => {
        if (req.method !== 'GET') {
            return next();
        }

        const key = `cache:${req.originalUrl}`;

        try {
            const cachedResponse = await redis.get(key);
            
            if (cachedResponse) {
                return res.json(JSON.parse(cachedResponse));
            }

            // Store original send
            const originalSend = res.json;
            
            // Override res.json method
            res.json = function(body) {
                redis.setex(key, duration, JSON.stringify(body));
                originalSend.call(this, body);
            };

            next();
        } catch (error) {
            console.error('Cache error:', error);
            next();
        }
    };
};

// Clear cache by pattern
const clearCache = async (pattern) => {
    try {
        const keys = await redis.keys(`cache:${pattern}`);
        if (keys.length > 0) {
            await redis.del(keys);
        }
    } catch (error) {
        console.error('Clear cache error:', error);
    }
};

// Cache invalidation middleware
const invalidateCache = (pattern) => {
    return async (req, res, next) => {
        // Store original end
        const originalEnd = res.end;

        // Override end method
        res.end = async function() {
            if (res.statusCode < 400) {
                await clearCache(pattern);
            }
            originalEnd.apply(this, arguments);
        };

        next();
    };
};

module.exports = {
    cache,
    clearCache,
    invalidateCache
>>>>>>> c24ff08aad83fc64379c0b79e46151d3783b8082
}; 