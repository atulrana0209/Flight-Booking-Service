module.exports = {
  testEnvironment: 'node',
  testTimeout: 30000,
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};
