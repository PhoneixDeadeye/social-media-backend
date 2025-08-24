// Jest setup file for test environment
require('dotenv').config();

// Set test environment
process.env.NODE_ENV = 'test';

// Increase timeout for database operations
jest.setTimeout(30000);

// Global test cleanup
afterAll(async () => {
  // Close database connections
  const db = require('../src/utils/database');
  if (db.pool) {
    await db.pool.end();
  }
});
