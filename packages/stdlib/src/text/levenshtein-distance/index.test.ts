import { describe, expect, it } from 'vitest';
import {levenshteinDistance} from '.';
  
describe('levenshteinDistance', () => {
    it('should calculate edit distance between two strings', () => {  
      // just one substitution I at the beginning
      expect(levenshteinDistance('islander', 'slander')).toBe(1);
  
      // substitution M->K, T->M and add an A to the end
      expect(levenshteinDistance('mart', 'karma')).toBe(3);
  
      // substitution K->S, E->I and insert G at the end
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
  
      // should add 4 letters FOOT at the beginning
      expect(levenshteinDistance('ball', 'football')).toBe(4);
  
      // should delete 4 letters FOOT at the beginning
      expect(levenshteinDistance('football', 'foot')).toBe(4);
  
      // needs to substitute the first 5 chars INTEN->EXECU
      expect(levenshteinDistance('intention', 'execution')).toBe(5);
    });

    it('should handle edge cases', () => {
        expect(levenshteinDistance('', '')).toBe(0);
        expect(levenshteinDistance('a', '')).toBe(1);
        expect(levenshteinDistance('', 'a')).toBe(1);
        expect(levenshteinDistance('abc', '')).toBe(3);
        expect(levenshteinDistance('', 'abc')).toBe(3);
    });
  });