/**
 * @name cluster
 * @category Arrays
 * @description Cluster an array into subarrays of a specific size
 * 
 * @param {Value[]} arr The array to cluster
 * @param {number} size The size of each cluster
 * @returns {Value[][]} The clustered array
 * 
 * @example
 * cluster([1, 2, 3, 4, 5, 6, 7, 8], 3) // => [[1, 2, 3], [4, 5, 6], [7, 8]]
 * 
 * @example
 * cluster([1, 2, 3, 4], -1) // => []
 * 
 * @since 0.0.3
 */
export function cluster<Value>(arr: Value[], size: number): Value[][] {
  if (size <= 0) return [];

  const clusterLength = Math.ceil(arr.length / size);

  return Array.from({ length: clusterLength }, (_, i) => arr.slice(i * size, i * size + size));
}
