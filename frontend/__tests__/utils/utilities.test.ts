// Copyright (c) 2025 WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.
import { capitalizeName } from '@/utils/capitalizeName';
import { formatPubDate } from '@/utils/formatPubDate';

describe('Utility Functions', () => {
  describe('capitalizeName', () => {
    it('should capitalize first letter of each word', () => {
      expect(capitalizeName('john doe')).toBe('John Doe');
    });

    it('should handle already capitalized names', () => {
      expect(capitalizeName('John Doe')).toBe('John Doe');
    });

    it('should handle all caps names', () => {
      expect(capitalizeName('JOHN DOE')).toBe('John Doe');
    });

    it('should handle single word names', () => {
      expect(capitalizeName('john')).toBe('John');
    });

    it('should handle empty string', () => {
      expect(capitalizeName('')).toBe('');
    });

    it('should handle multiple spaces', () => {
      expect(capitalizeName('john  doe')).toContain('John');
    });

    it('should handle mixed case', () => {
      expect(capitalizeName('jOhN DoE')).toBe('John Doe');
    });
  });

  describe('formatPubDate', () => {
    it('should format date correctly', () => {
      const result = formatPubDate('Mon, 01 Jan 2025 00:00:00 GMT');
      expect(result).toContain('JAN');
      expect(result).toContain('2025');
      expect(result).toContain('01');
    });

    it('should handle invalid date strings', () => {
      const result = formatPubDate('invalid date');
      // Should not crash
      expect(result).toBeDefined();
    });

    it('should handle ISO date format', () => {
      const result = formatPubDate('2025-01-01T00:00:00Z');
      expect(result).toBeDefined();
    });

    it('should handle empty string', () => {
      const result = formatPubDate('');
      expect(result).toBeDefined();
    });

    it('should return consistent format for same date', () => {
      const date1 = formatPubDate('2025-01-01');
      const date2 = formatPubDate('2025-01-01');
      expect(date1).toBe(date2);
    });
  });
});
