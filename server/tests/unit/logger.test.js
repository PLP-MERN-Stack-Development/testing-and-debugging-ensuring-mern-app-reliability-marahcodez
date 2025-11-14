// Unit tests for logger utility

const { logError, logWarn, logInfo, logDebug, LOG_LEVELS } = require('../../src/utils/logger');

describe('Logger Utility', () => {
  // Store original console methods
  const originalConsole = {
    error: console.error,
    warn: console.warn,
    log: console.log,
  };

  beforeEach(() => {
    // Mock console methods
    console.error = jest.fn();
    console.warn = jest.fn();
    console.log = jest.fn();
  });

  afterAll(() => {
    // Restore original console methods
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.log = originalConsole.log;
  });

  describe('logError', () => {
    it('should log error messages', () => {
      logError('Test error message');
      expect(console.error).toHaveBeenCalled();
      
      const logOutput = console.error.mock.calls[0][0];
      expect(logOutput).toContain('[ERROR]');
      expect(logOutput).toContain('Test error message');
    });

    it('should log error with metadata', () => {
      const error = new Error('Something went wrong');
      logError('Error occurred', error);
      
      expect(console.error).toHaveBeenCalled();
      const logOutput = console.error.mock.calls[0][0];
      expect(logOutput).toContain('[ERROR]');
      expect(logOutput).toContain('Error occurred');
    });

    it('should include timestamp in log', () => {
      logError('Test error');
      const logOutput = console.error.mock.calls[0][0];
      
      // Check for ISO timestamp format
      expect(logOutput).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
    });
  });

  describe('logWarn', () => {
    it('should log warning messages', () => {
      logWarn('Test warning message');
      expect(console.warn).toHaveBeenCalled();
      
      const logOutput = console.warn.mock.calls[0][0];
      expect(logOutput).toContain('[WARN]');
      expect(logOutput).toContain('Test warning message');
    });

    it('should log warning with metadata', () => {
      logWarn('Warning message', { userId: '123', action: 'update' });
      expect(console.warn).toHaveBeenCalled();
      
      const logOutput = console.warn.mock.calls[0][0];
      expect(logOutput).toContain('[WARN]');
      expect(logOutput).toContain('Warning message');
      expect(logOutput).toContain('userId');
    });
  });

  describe('logInfo', () => {
    it('should log info messages', () => {
      logInfo('Test info message');
      expect(console.log).toHaveBeenCalled();
      
      const logOutput = console.log.mock.calls[0][0];
      expect(logOutput).toContain('[INFO]');
      expect(logOutput).toContain('Test info message');
    });

    it('should log info with metadata', () => {
      logInfo('Info message', { status: 'success', count: 5 });
      expect(console.log).toHaveBeenCalled();
      
      const logOutput = console.log.mock.calls[0][0];
      expect(logOutput).toContain('[INFO]');
      expect(logOutput).toContain('Info message');
    });
  });

  describe('logDebug', () => {
    it('should log debug messages in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      logDebug('Debug message');
      expect(console.log).toHaveBeenCalled();
      
      const logOutput = console.log.mock.calls[0][0];
      expect(logOutput).toContain('[DEBUG]');
      expect(logOutput).toContain('Debug message');
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should not log debug messages in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      logDebug('Debug message');
      expect(console.log).not.toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('LOG_LEVELS', () => {
    it('should have all log levels defined', () => {
      expect(LOG_LEVELS.ERROR).toBe('ERROR');
      expect(LOG_LEVELS.WARN).toBe('WARN');
      expect(LOG_LEVELS.INFO).toBe('INFO');
      expect(LOG_LEVELS.DEBUG).toBe('DEBUG');
    });
  });
});
