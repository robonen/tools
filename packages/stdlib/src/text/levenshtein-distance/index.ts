/**
 * Calculate the Levenshtein distance between two strings
 * 
 * @param {string} left First string
 * @param {string} right Second string
 * @returns {number} The Levenshtein distance between the two strings
 */
export function levenshteinDistance(left: string, right: string): number {
    // If the strings are equal, the distance is 0
    if (left === right) return 0;

    // If either string is empty, the distance is the length of the other string
    if (left.length === 0) return right.length;
    if (right.length === 0) return left.length;

    // Create empty edit distance matrix for all possible modifications of
    // substrings of left to substrings of right
    const distanceMatrix = Array(right.length + 1).fill(null).map(() => Array(left.length + 1).fill(null));

    // Fill the first row of the matrix
    // If this is the first row, we're transforming from an empty string to left
    // In this case, the number of operations equals the length of left substring
    for (let i = 0; i <= left.length; i++)
        distanceMatrix[0]![i]! = i;

    // Fill the first column of the matrix
    // If this is the first column, we're transforming empty string to right
    // In this case, the number of operations equals the length of right substring
    for (let j = 0; j <= right.length; j++)
        distanceMatrix[j]![0]! = j;

    for (let j = 1; j <= right.length; j++) {
        for (let i = 1; i <= left.length; i++) {
            const indicator = left[i - 1] === right[j - 1] ? 0 : 1;
            distanceMatrix[j]![i]! = Math.min(
                distanceMatrix[j]![i - 1]! + 1, // deletion
                distanceMatrix[j - 1]![i]! + 1, // insertion
                distanceMatrix[j - 1]![i - 1]! + indicator // substitution
            );
        }
    }

    return distanceMatrix[right.length]![left.length]!;
}
