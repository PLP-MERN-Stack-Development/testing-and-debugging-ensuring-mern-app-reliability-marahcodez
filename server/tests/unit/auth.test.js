// Unit tests for authentication utilities

const { generateToken, verifyToken, extractToken } = require('../../src/utils/auth');

describe('Auth Utilities', () => {
  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    email: 'test@example.com',
    role: 'user',
  };

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken(mockUser);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include user information in token payload', () => {
      const token = generateToken(mockUser);
      const decoded = verifyToken(token);
      
      expect(decoded.id).toBe(mockUser._id);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.role).toBe(mockUser.role);
    });

    it('should set expiration time', () => {
      const token = generateToken(mockUser);
      const decoded = verifyToken(token);
      
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });
  });

  describe('verifyToken', () => {
    it('should verify valid tokens', () => {
      const token = generateToken(mockUser);
      const decoded = verifyToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded.id).toBe(mockUser._id);
    });

    it('should throw error for invalid tokens', () => {
      expect(() => verifyToken('invalid.token.here')).toThrow();
    });

    it('should throw error for malformed tokens', () => {
      expect(() => verifyToken('notavalidtoken')).toThrow();
    });

    it('should throw error for empty token', () => {
      expect(() => verifyToken('')).toThrow();
    });
  });

  describe('extractToken', () => {
    it('should extract token from valid Bearer header', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';
      const authHeader = `Bearer ${token}`;
      
      expect(extractToken(authHeader)).toBe(token);
    });

    it('should return null for missing Bearer prefix', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';
      expect(extractToken(token)).toBe(null);
    });

    it('should return null for undefined header', () => {
      expect(extractToken(undefined)).toBe(null);
    });

    it('should return null for null header', () => {
      expect(extractToken(null)).toBe(null);
    });

    it('should return null for empty string', () => {
      expect(extractToken('')).toBe(null);
    });

    it('should handle case-sensitive Bearer prefix', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';
      expect(extractToken(`bearer ${token}`)).toBe(null);
      expect(extractToken(`BEARER ${token}`)).toBe(null);
    });
  });
});
