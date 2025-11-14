// Unit tests for validation utilities

const {
  validateEmail,
  validatePassword,
  sanitizeInput,
  validateObjectId,
  validateUsername,
} = require('../../src/utils/validation');

describe('Validation Utilities', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('user+tag@example.com')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid.email')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
      expect(validateEmail('user @domain.com')).toBe(false);
    });

    it('should reject empty or null values', () => {
      expect(validateEmail('')).toBe(false);
      expect(validateEmail(null)).toBe(false);
      expect(validateEmail(undefined)).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      const result = validatePassword('Password123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require minimum length', () => {
      const result = validatePassword('Pass1');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 6 characters long');
    });

    it('should require uppercase letter', () => {
      const result = validatePassword('password123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should require lowercase letter', () => {
      const result = validatePassword('PASSWORD123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should require number', () => {
      const result = validatePassword('Password');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize HTML special characters', () => {
      const input = '<script>alert("XSS")</script>';
      const expected = '&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;';
      expect(sanitizeInput(input)).toBe(expected);
    });

    it('should handle ampersands', () => {
      expect(sanitizeInput('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('should handle quotes', () => {
      const input = `He said "Hello" and she said 'Hi'`;
      const expected = `He said &quot;Hello&quot; and she said &#x27;Hi&#x27;`;
      expect(sanitizeInput(input)).toBe(expected);
    });

    it('should handle non-string inputs', () => {
      expect(sanitizeInput(123)).toBe(123);
      expect(sanitizeInput(null)).toBe(null);
      expect(sanitizeInput(undefined)).toBe(undefined);
    });
  });

  describe('validateObjectId', () => {
    it('should validate correct MongoDB ObjectIds', () => {
      expect(validateObjectId('507f1f77bcf86cd799439011')).toBe(true);
      expect(validateObjectId('5f9b3b3b9d3f3e1e3c3e3e3e')).toBe(true);
    });

    it('should reject invalid ObjectIds', () => {
      expect(validateObjectId('invalid-id')).toBe(false);
      expect(validateObjectId('123')).toBe(false);
      expect(validateObjectId('507f1f77bcf86cd79943901')).toBe(false); // Too short
      expect(validateObjectId('507f1f77bcf86cd7994390111')).toBe(false); // Too long
    });

    it('should handle special characters', () => {
      expect(validateObjectId('507f1f77bcf86cd799439@11')).toBe(false);
      expect(validateObjectId('507f-1f77-bcf8-6cd7-9943-9011')).toBe(false);
    });
  });

  describe('validateUsername', () => {
    it('should validate correct usernames', () => {
      const result = validateUsername('user123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate usernames with underscores and hyphens', () => {
      expect(validateUsername('user_name').isValid).toBe(true);
      expect(validateUsername('user-name').isValid).toBe(true);
      expect(validateUsername('user_name-123').isValid).toBe(true);
    });

    it('should require minimum length', () => {
      const result = validateUsername('ab');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Username must be at least 3 characters long');
    });

    it('should enforce maximum length', () => {
      const result = validateUsername('a'.repeat(31));
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Username cannot exceed 30 characters');
    });

    it('should reject special characters', () => {
      const result = validateUsername('user@name');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Username can only contain letters, numbers, underscores, and hyphens'
      );
    });

    it('should reject spaces', () => {
      const result = validateUsername('user name');
      expect(result.isValid).toBe(false);
    });
  });
});
