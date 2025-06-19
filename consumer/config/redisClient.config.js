const Redis = require('ioredis');
require('dotenv').config();

const redisClient = new Redis({
    port: process.env.REDIS_PORT,
    host: process.env.REDIS_HOST,
    password: process.env.REDIS_PASSWORD,
    username: process.env.REDIS_USERNAME,
    db: process.env.REDIS_DB || 0
});

redisClient.on('error', (err) => {
    console.error('Redis Client Error', err);
});

redisClient.on('connect', () => {
    console.log('Connected to Redis');
});

redisClient.on('ready', () => {
    console.log('Redis Client is ready');
});

redisClient.on('end', () => {
    console.log('Redis Client connection closed');
});

// redisClient.connect().catch((err) => {
//     console.error('Failed to connect to Redis', err);
// });

module.exports = redisClient;