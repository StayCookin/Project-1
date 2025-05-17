class RateLimiter {
    constructor(limit = 5, windowMs = 1000 * 60) {
        this.requests = new Map();
        this.limit = limit;
        this.windowMs = windowMs;
    }

    async check(ip) {
        const now = Date.now();
        const requests = this.requests.get(ip) || [];

        // Remove old requests
        while (requests.length > 0 && now - requests[0] > this.windowMs) {
            requests.shift();
        }

        if (requests.length >= this.limit) {
            throw new Error('Too many requests. Please try again later.');
        }

        requests.push(now);
        this.requests.set(ip, requests);
        return true;
    }

    clear(ip) {
        this.requests.delete(ip);
    }

    clearAll() {
        this.requests.clear();
    }
}

// Create rate limiters for different endpoints
const rateLimiters = {
    passwordReset: new RateLimiter(3, 1000 * 60 * 30), // 3 requests per 30 minutes
    emailVerification: new RateLimiter(5, 1000 * 60 * 60), // 5 requests per hour
    forgotPassword: new RateLimiter(2, 1000 * 60 * 60 * 24), // 2 requests per day
};

export default rateLimiters;
