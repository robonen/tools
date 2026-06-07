/**
 * @name levenshteinDistance
 * @category Text
 * @description Calculate the Levenshtein distance between two strings
 *
 * @param {string} left First string
 * @param {string} right Second string
 * @returns {number} The Levenshtein distance between the two strings
 *
 * @since 0.0.1
 */
export function levenshteinDistance(left: string, right: string): number {
  if (left === right) return 0;

  if (left.length === 0) return right.length;
  if (right.length === 0) return left.length;

  // Iterate with the shorter string as the inner dimension so the rolling rows are
  // O(min(m, n)) memory instead of a full O(m * n) matrix.
  const outer = left.length >= right.length ? left : right;
  const inner = left.length >= right.length ? right : left;
  const innerLength = inner.length;

  // prev = previous row; current = row being computed. prev starts as the base row [0..innerLength].
  let prev = Array.from({ length: innerLength + 1 }, (_, i) => i);
  let current = Array.from<number>({ length: innerLength + 1 });

  for (let i = 1; i <= outer.length; i++) {
    current[0] = i;
    const outerChar = outer[i - 1];

    for (let j = 1; j <= innerLength; j++) {
      const cost = outerChar === inner[j - 1] ? 0 : 1;
      current[j]! = Math.min(
        prev[j]! + 1, // insertion
        current[j - 1]! + 1, // deletion
        prev[j - 1]! + cost, // substitution
      );
    }

    // Swap the rolling rows; the freshly computed row becomes `prev` for the next iteration.
    const next = prev;
    prev = current;
    current = next;
  }

  return prev[innerLength]!;
}
