import type { OpId } from '../clock';
import { compareOpId, opIdEq, opIdToString } from '../clock';

/** A mark's value: `true`/attrs to apply, `null`/`false` to clear. JSON-serializable. */
export type MarkValue = boolean | string | number | null | { readonly [key: string]: MarkValue };

/**
 * A formatting span anchored to character op ids (inclusive range), tagged with
 * an op id for LWW conflict resolution — a lightweight Peritext mark.
 */
export interface MarkSpan {
  readonly id: OpId;
  readonly type: string;
  readonly value: MarkValue;
  readonly start: OpId;
  readonly end: OpId;
}

/**
 * Stores formatting spans and resolves them against a character order. For each
 * (character, mark type) the covering span with the highest op id wins, so
 * concurrent formatting converges; a `null`/`false` value clears the mark.
 */
export class MarkStore {
  private spans: MarkSpan[] = [];

  add(span: MarkSpan): boolean {
    if (this.has(span.id))
      return false;
    this.spans.push(span);
    return true;
  }

  has(id: OpId): boolean {
    return this.spans.some(span => opIdEq(span.id, id));
  }

  all(): readonly MarkSpan[] {
    return this.spans;
  }

  /**
   * Active marks for each character, given the character ids in document order.
   * Returns one `type → value` map per index.
   */
  resolve(order: readonly OpId[]): Array<Map<string, MarkValue>> {
    const indexOf = new Map<string, number>();
    order.forEach((id, i) => indexOf.set(opIdToString(id), i));

    const active: Array<Map<string, MarkValue>> = order.map(() => new Map());
    const winner: Array<Map<string, OpId>> = order.map(() => new Map());

    for (const span of this.spans) {
      const startIndex = indexOf.get(opIdToString(span.start));
      const endIndex = indexOf.get(opIdToString(span.end));

      if (startIndex === undefined || endIndex === undefined)
        continue;

      const lo = Math.min(startIndex, endIndex);
      const hi = Math.max(startIndex, endIndex);

      for (let i = lo; i <= hi; i++) {
        const current = winner[i]!.get(span.type);
        if (current && compareOpId(span.id, current) <= 0)
          continue;

        winner[i]!.set(span.type, span.id);
        if (span.value === null || span.value === false)
          active[i]!.delete(span.type);
        else
          active[i]!.set(span.type, span.value);
      }
    }

    return active;
  }
}
