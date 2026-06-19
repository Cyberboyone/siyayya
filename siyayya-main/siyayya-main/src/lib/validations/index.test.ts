import { describe, it, expect } from 'vitest';
import { sanitizeText, UserRegistrationSchema, ProductListingSchema } from './index';

describe('validations', () => {
  describe('sanitizeText', () => {
    it('escapes basic HTML entities', () => {
      const input = '<script>alert("xss & hax\'")</script>';
      const expected = '&lt;script&gt;alert(&quot;xss &amp; hax&#039;&quot;)&lt;/script&gt;';
      expect(sanitizeText(input)).toBe(expected);
    });

    it('returns empty string for falsy values', () => {
      expect(sanitizeText('')).toBe('');
      expect(sanitizeText(null as unknown as string)).toBeNull();
    });

    it('leaves safe text alone', () => {
      expect(sanitizeText('Hello World 123')).toBe('Hello World 123');
    });
  });

  describe('UserRegistrationSchema', () => {
    it('validates a correct user profile', () => {
      const result = UserRegistrationSchema.safeParse({
        name: 'John Doe',
        phone: '08012345678',
      });
      expect(result.success).toBe(true);
    });

    it('fails if name is too short', () => {
      const result = UserRegistrationSchema.safeParse({
        name: 'J',
        phone: '08012345678',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('ProductListingSchema', () => {
    it('validates a complete product', () => {
      const result = ProductListingSchema.safeParse({
        title: 'Macbook Pro',
        description: 'A very nice laptop for sale',
        price: 150000,
        category: 'Electronics',
        contactPhone: '08012345678',
        condition: 'Used',
        images: ['https://example.com/image.jpg'],
        youtubeUrl: ''
      });
      expect(result.success).toBe(true);
    });

    it('fails on negative price', () => {
      const result = ProductListingSchema.safeParse({
        title: 'Macbook Pro',
        description: 'A very nice laptop for sale',
        price: -50,
        category: 'Electronics',
        contactPhone: '08012345678',
        images: [],
        youtubeUrl: ''
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Price cannot be negative');
      }
    });
  });
});
