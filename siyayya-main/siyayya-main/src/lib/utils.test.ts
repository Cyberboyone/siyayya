import { describe, it, expect } from 'vitest';
import {
  cn,
  getNumericDate,
  formatDate,
  formatPhoneNumberForWhatsApp,
  extractYouTubeId,
  getYouTubeEmbedUrl,
  isValidYouTubeUrl
} from './utils';

describe('utils', () => {
  describe('cn', () => {
    it('merges tailwind classes correctly', () => {
      expect(cn('bg-red-500', 'text-white')).toBe('bg-red-500 text-white');
      expect(cn('p-4', { 'bg-blue-500': true, 'text-black': false })).toBe('p-4 bg-blue-500');
      expect(cn('p-4 p-8')).toBe('p-8'); // twMerge resolves conflicts
    });
  });

  describe('getNumericDate', () => {
    it('handles null/undefined', () => {
      expect(getNumericDate(null)).toBe(0);
      expect(getNumericDate(undefined)).toBe(0);
    });

    it('handles JS Dates', () => {
      const date = new Date('2023-01-01T00:00:00.000Z');
      expect(getNumericDate(date)).toBe(date.getTime());
    });

    it('handles ISO strings', () => {
      const dateString = '2023-01-01T00:00:00.000Z';
      expect(getNumericDate(dateString)).toBe(new Date(dateString).getTime());
    });
    
    it('handles invalid dates', () => {
      expect(getNumericDate('not a date')).toBe(0);
    });
  });

  describe('formatPhoneNumberForWhatsApp', () => {
    it('converts local 080 format to 234 format', () => {
      expect(formatPhoneNumberForWhatsApp('08012345678')).toBe('2348012345678');
    });

    it('removes spaces and special characters', () => {
      expect(formatPhoneNumberForWhatsApp('+234 801 234 5678')).toBe('2348012345678');
    });

    it('leaves already formatted numbers alone', () => {
      expect(formatPhoneNumberForWhatsApp('2348012345678')).toBe('2348012345678');
    });

    it('prepends 234 if 10 digits starting with 8', () => {
      expect(formatPhoneNumberForWhatsApp('8012345678')).toBe('2348012345678');
    });

    it('returns empty string for falsy values', () => {
      expect(formatPhoneNumberForWhatsApp('')).toBe('');
    });
  });

  describe('YouTube URL utilities', () => {
    const validId = 'dQw4w9WgXcQ';
    
    it('extracts ID from various URL formats', () => {
      expect(extractYouTubeId(`https://www.youtube.com/watch?v=${validId}`)).toBe(validId);
      expect(extractYouTubeId(`https://youtu.be/${validId}`)).toBe(validId);
      expect(extractYouTubeId(`https://www.youtube.com/shorts/${validId}`)).toBe(validId);
    });

    it('returns null for invalid URLs', () => {
      expect(extractYouTubeId('https://google.com')).toBeNull();
      expect(extractYouTubeId('not a url')).toBeNull();
      expect(extractYouTubeId('')).toBeNull();
    });

    it('validates URLs correctly', () => {
      expect(isValidYouTubeUrl(`https://youtu.be/${validId}`)).toBe(true);
      expect(isValidYouTubeUrl('https://vimeo.com/123456')).toBe(false);
    });

    it('generates embed URLs', () => {
      expect(getYouTubeEmbedUrl(`https://youtu.be/${validId}`)).toBe(`https://www.youtube.com/embed/${validId}`);
      expect(getYouTubeEmbedUrl('invalid')).toBeNull();
    });
  });
});
