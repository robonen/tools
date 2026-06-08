import type { OpId } from '../clock';
import { compareOpId } from '../clock';

/**
 * Last-writer-wins register. A write applies only if its op id is later than the
 * current write's (by {@link compareOpId}), so concurrent writes converge to the
 * one with the higher timestamp regardless of arrival order.
 */
export class LwwRegister<T> {
  private ts: OpId | null = null;

  constructor(private current: T) {}

  get(): T {
    return this.current;
  }

  /** Apply a timestamped write. Returns `true` if it won. */
  set(value: T, id: OpId): boolean {
    if (this.ts !== null && compareOpId(id, this.ts) <= 0)
      return false;

    this.current = value;
    this.ts = id;
    return true;
  }

  get timestamp(): OpId | null {
    return this.ts;
  }
}
