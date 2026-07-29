/**
 * @name FenwickTree
 * @category Data Structures
 * @description Fenwick (Binary Indexed) tree over an array of non-negative
 * numbers: O(log n) prefix sums, point updates, and monotonic lower-bound
 * search, plus O(n) bulk rebuild. `lowerBound` assumes all values are
 * non-negative (the prefix function must be non-decreasing)
 *
 * @example
 * const tree = new FenwickTree(5);
 * tree.build([10, 20, 30, 40, 50]);
 * tree.prefix(3); // 60
 * tree.update(1, 5); // value at index 1 becomes 25
 * tree.lowerBound(65); // 3 — largest c with prefix(c) <= 65
 *
 * @since 0.0.11
 */
export class FenwickTree {
  readonly size: number;
  private readonly tree: Float64Array;
  private readonly highBit: number;

  constructor(size: number) {
    this.size = size;
    this.tree = new Float64Array(size + 1);
    this.highBit = size > 0 ? 1 << (31 - Math.clz32(size)) : 0;
  }

  /**
   * Bulk (re)initialization from raw values, O(n)
   *
   * @param {ArrayLike<number>} values The values to load, `values.length` must equal `size`
   */
  build(values: ArrayLike<number>): void {
    const { tree, size } = this;
    tree.fill(0);
    for (let i = 1; i <= size; i++) {
      tree[i]! += values[i - 1]!;
      const parent = i + (i & -i);
      if (parent <= size)
        tree[parent]! += tree[i]!;
    }
  }

  /**
   * Add `delta` to the value at `index`, O(log n)
   *
   * @param {number} index Zero-based index of the value to change
   * @param {number} delta Amount to add (may be negative)
   */
  update(index: number, delta: number): void {
    for (let i = index + 1; i <= this.size; i += i & -i)
      this.tree[i]! += delta;
  }

  /**
   * Sum of the first `count` values, O(log n)
   *
   * @param {number} count How many leading values to sum
   * @returns {number} The prefix sum
   */
  prefix(count: number): number {
    let sum = 0;
    for (let i = count; i > 0; i -= i & -i)
      sum += this.tree[i]!;
    return sum;
  }

  /**
   * Largest `c` in `[0, size]` with `prefix(c) + c * stride <= target`, O(log n).
   * `stride` models a constant per-item addition (e.g. a layout gap) without
   * storing it in the tree
   *
   * @param {number} target The offset to search for
   * @param {number} stride Constant added per item, defaults to `0`
   * @returns {number} The largest count whose strided prefix does not exceed `target`
   */
  lowerBound(target: number, stride = 0): number {
    if (target < 0)
      return 0;
    let pos = 0;
    let sum = 0;
    for (let step = this.highBit; step > 0; step >>= 1) {
      const next = pos + step;
      if (next <= this.size) {
        const candidate = sum + this.tree[next]!;
        if (candidate + next * stride <= target) {
          pos = next;
          sum = candidate;
        }
      }
    }
    return pos;
  }
}
