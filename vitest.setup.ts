/**
 * Vitest Setup File
 * 
 * Configures the test environment for all tests.
 */

import '@testing-library/jest-dom';

// Mock environment variables for tests
beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/gacharshop-test';
    process.env.NEXTAUTH_SECRET = 'test-secret-key';
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
});

// Mock console methods to reduce noise in tests
// Uncomment if you want quieter tests
// global.console = {
//   ...console,
//   log: vi.fn(),
//   debug: vi.fn(),
//   info: vi.fn(),
//   warn: vi.fn(),
//   error: vi.fn(),
// };

// Increase timeout for async operations
vi.setConfig({
    testTimeout: 10000,
});
