import { describe, it, expect } from 'vitest';
import { trigramDistance, trigramProfile } from '.';

describe('trigramProfile', () => {
    it('trigram profile of a text with different trigrams', () => {
        const different_trigrams = 'hello world';
        const profile1 = trigramProfile(different_trigrams);

        expect(profile1).toEqual(new Map([
            ['\n\nh', 1],
            ['\nhe', 1],
            ['hel', 1],
            ['ell', 1],
            ['llo', 1],
            ['lo ', 1],
            ['o w', 1],
            [' wo', 1],
            ['wor', 1],
            ['orl', 1],
            ['rld', 1],
            ['ld\n', 1],
            ['d\n\n', 1]
        ]));
    });

    it('trigram profile of a text with repeated trigrams', () => {
        const repeated_trigrams = 'hello hello';
        const profile2 = trigramProfile(repeated_trigrams);

        expect(profile2).toEqual(new Map([
            ['\n\nh', 1],
            ['\nhe', 1],
            ['hel', 2],
            ['ell', 2],
            ['llo', 2],
            ['lo ', 1],
            ['o h', 1],
            [' he', 1],
            ['lo\n', 1],
            ['o\n\n', 1]
        ]));
    });

    it('trigram profile of an empty text', () => {
        const text = '';
        const profile = trigramProfile(text);

        expect(profile).toEqual(new Map([
            ['\n\n\n', 2],
        ]));
    });
});

describe('trigramDistance', () => {
    it('zero when comparing the same text', () => {
        const profile1 = trigramProfile('hello world');
        const profile2 = trigramProfile('hello world');

        expect(trigramDistance(profile1, profile2)).toBe(0);
    });

    it('one for completely different text', () => {
        const profile1 = trigramProfile('hello world');
        const profile2 = trigramProfile('lorem ipsum');

        expect(trigramDistance(profile1, profile2)).toBe(1);
    });

    it('one for empty text and non-empty text', () => {
        const profile1 = trigramProfile('hello world');
        const profile2 = trigramProfile('');

        expect(trigramDistance(profile1, profile2)).toBe(1);
    });

    it('approximately 0.5 for similar text', () => {
        const profile1 = trigramProfile('hello world');
        const profile2 = trigramProfile('hello lorem');

        const approx = trigramDistance(profile1, profile2);

        expect(approx).toBeGreaterThan(0.45);
        expect(approx).toBeLessThan(0.55);
    });

    it('triangle inequality', () => {
        const A = trigramDistance(trigramProfile('metric'), trigramProfile('123ric'));
        const B = trigramDistance(trigramProfile('123ric'), trigramProfile('123456'));
        const C = trigramDistance(trigramProfile('metric'), trigramProfile('123456'));

        expect(A + B).toBeGreaterThanOrEqual(C);
    });
});