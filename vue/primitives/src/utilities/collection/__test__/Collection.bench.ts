import { bench, describe } from 'vitest';

// Baseline for the `getItems()` DOM-order sort in useCollection.ts. `getItems`
// runs per keystroke / per pointer-move across the roving-focus / menu / listbox
// / tree family, so its complexity dominates keyboard-nav and typeahead cost.
//
// This benches the SORT STRATEGY in isolation (the part the fix changed), at the
// list sizes those components realistically reach:
//   OLD: comparator calls `orderedNodes.indexOf()` twice per comparison → each
//        comparison is O(n), the whole sort O(n² log n).
//   NEW: build a `Map<node, index>` once (O(n)), comparator does two O(1)
//        lookups → O(n log n) overall.
// Fixtures are real detached elements (the same identity model querySelectorAll
// yields), seeded deterministically — NO Math.random.

interface Item { ref: HTMLElement; value: number }

/** Build `n` detached elements, the DOM-ordered array, and a deterministically
 *  shuffled `items` list (worst-ish case for a sort: not already ordered). */
function fixture(n: number): { ordered: HTMLElement[]; items: Item[] } {
  const ordered: HTMLElement[] = [];
  for (let i = 0; i < n; i++) ordered.push(document.createElement('div'));

  // Deterministic shuffle: index-based stride so registration order ≠ DOM order.
  const items: Item[] = [];
  for (let i = 0; i < n; i++) {
    const idx = (i * 7 + 3) % n;
    items.push({ ref: ordered[idx]!, value: idx });
  }
  return { ordered, items };
}

/** OLD strategy: indexOf inside the comparator (O(n) per call). */
function sortOld(ordered: HTMLElement[], items: Item[]): Item[] {
  const copy = items.slice();
  copy.sort((a, b) => ordered.indexOf(a.ref) - ordered.indexOf(b.ref));
  return copy;
}

/** NEW strategy: precomputed node→index Map, O(1) per comparison. */
function sortNew(ordered: HTMLElement[], items: Item[]): Item[] {
  const copy = items.slice();
  if (copy.length > 1) {
    const orderByNode = new Map<Element, number>();
    for (let i = 0; i < ordered.length; i++) orderByNode.set(ordered[i]!, i);
    copy.sort((a, b) => {
      const ai = orderByNode.get(a.ref);
      const bi = orderByNode.get(b.ref);
      return (ai === undefined ? -1 : ai) - (bi === undefined ? -1 : bi);
    });
  }
  return copy;
}

const sizes = [12, 50, 200, 1000];

for (const n of sizes) {
  const { ordered, items } = fixture(n);

  describe(`getItems sort — ${n} items`, () => {
    bench('OLD — indexOf-in-comparator (O(n² log n))', () => {
      sortOld(ordered, items);
    });

    bench('NEW — Map<node,index> lookup (O(n log n))', () => {
      sortNew(ordered, items);
    });
  });
}
