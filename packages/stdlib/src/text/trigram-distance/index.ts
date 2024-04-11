export type Trigrams = Map<string, number>;

/**
 * Extracts trigrams from a text and returns a map of trigram to count
 * 
 * @param {string} text The text to extract trigrams
 * @returns {Trigrams} A map of trigram to count
 */
export function trigramProfile(text: string): Trigrams {
    text = '\n\n' + text + '\n\n';

    const trigrams = new Map<string, number>();

    for (let i = 0; i < text.length - 2; i++) {
        const trigram = text.slice(i, i + 3);
        const count = trigrams.get(trigram) ?? 0;
        trigrams.set(trigram, count + 1);
    }

    return trigrams;
}

/**
 * Calculates the trigram distance between two strings
 * 
 * @param {Trigrams} left First text trigram profile
 * @param {Trigrams} right Second text trigram profile
 * @returns {number} The trigram distance between the two strings
 */
export function trigramDistance(left: Trigrams, right: Trigrams): number {
    let distance = -4;
    let total = -4;

    for (const [trigram, left_count] of left) {
        total += left_count;
        const right_count = right.get(trigram) ?? 0;
        distance += Math.abs(left_count - right_count);
    }

    for (const [trigram, right_count] of right) {
        total += right_count;
        const left_count = left.get(trigram) ?? 0;
        distance += Math.abs(left_count - right_count);
    }

    if (distance < 0) return 0;

    return distance / total;
}