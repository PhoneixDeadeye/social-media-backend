/**
 * Redis Configuration and Connection Test
 * Simple Redis setup for job queue storage
 */

const redis = require('redis');
const { verbose, critical: logError } = require('./logger');

// Create Redis client with retry logic
const createRedisClient = () => {
    const client = redis.createClient({
        port: process.env.REDIS_PORT || 6379,
        host: process.env.REDIS_HOST || 'localhost',
        retry_strategy: (options) => {
            if (options.error && options.error.code === 'ECONNREFUSED') {
                // End reconnecting on a specific error and flush all commands with
                // a individual error
                return new Error('The Redis server refused the connection');
            }
            if (options.total_retry_time > 1000 * 60 * 60) {
                // End reconnecting after a specific timeout and flush all commands
                // with a individual error
                return new Error('Retry time exhausted');
            }
            if (options.attempt > 10) {
                // End reconnecting with built in error
                return undefined;
            }
            // reconnect after
            return Math.min(options.attempt * 100, 3000);
        }
    });

    client.on('connect', () => {
        verbose('Redis client connected');
    });

    client.on('ready', () => {
        verbose('Redis client ready');
    });

    client.on('error', (err) => {
        logError('Redis client error:', err);
    });

    client.on('end', () => {
        verbose('Redis client disconnected');
    });

    return client;
};

/**
 * Test Redis connection
 * @returns {Promise<boolean>} True if connection successful
 */
const testRedisConnection = async () => {
    try {
        const client = createRedisClient();
        
        // Test basic operations
        await client.set('test_key', 'test_value');
        const result = await client.get('test_key');
        await client.del('test_key');
        
        await client.quit();
        
        if (result === 'test_value') {
            verbose('Redis connection test passed');
            return true;
        } else {
            logError('Redis connection test failed: unexpected result');
            return false;
        }
        
    } catch (err) {
        logError('Redis connection test failed:', err.message);
        return false;
    }
};

/**
 * Mock Redis for development/testing when Redis is not available
 * This provides a simple in-memory fallback
 */
class MockRedis {
    constructor() {
        this.data = new Map();
        this.verbose = true;
    }
    
    async set(key, value) {
        this.data.set(key, value);
        if (this.verbose) verbose('MockRedis SET:', { key, value });
        return 'OK';
    }
    
    async get(key) {
        const value = this.data.get(key);
        if (this.verbose) verbose('MockRedis GET:', { key, value });
        return value;
    }
    
    async del(key) {
        const result = this.data.delete(key);
        if (this.verbose) verbose('MockRedis DEL:', { key, result });
        return result ? 1 : 0;
    }
    
    async quit() {
        if (this.verbose) verbose('MockRedis QUIT');
        return 'OK';
    }
    
    on(event, callback) {
        // Mock event handling
        if (event === 'ready') {
            setTimeout(callback, 0);
        }
    }
}

module.exports = {
    createRedisClient,
    testRedisConnection,
    MockRedis
};
