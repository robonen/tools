/**
 * Calculate the Levenshtein distance between two strings
 * 
 * @param {string} a First string
 * @param {string} b Second string
 * @returns {number} The Levenshtein distance between the two strings
 */
export default function levenshteinDistance(a: string, b: string): number {
    // If the strings are equal, the distance is 0
    if (a === b) return 0;

    // If either string is empty, the distance is the length of the other string
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    // Create empty edit distance matrix for all possible modifications of
    // substrings of a to substrings of b
    const distanceMatrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

    // Fill the first row of the matrix
    // If this is the first row, we're transforming from an empty string to a
    // In this case, the number of operations equals the length of a substring
    for (let i = 0; i <= a.length; i++)
        distanceMatrix[0]![i]! = i;

    // Fill the first column of the matrix
    // If this is the first column, we're transforming empty string to b
    // In this case, the number of operations equals the length of b substring
    for (let j = 0; j <= b.length; j++)
        distanceMatrix[j]![0]! = j;

    for (let j = 1; j <= b.length; j++) {
        for (let i = 1; i <= a.length; i++) {
            const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
            distanceMatrix[j]![i]! = Math.min(
                distanceMatrix[j]![i - 1]! + 1, // deletion
                distanceMatrix[j - 1]![i]! + 1, // insertion
                distanceMatrix[j - 1]![i - 1]! + indicator // substitution
            );
        }
    }

    return distanceMatrix[b.length]![a.length]!;
}
