import type { OpId } from '../clock';
import { compareOpId } from '../clock';

interface Entry<V> {
  value: V;
  ts: OpId;
  deleted: boolean;
}

/**
 * Last-writer-wins map with per-key timestamps and tombstones. Concurrent
 * set/delete on a key converge to the operation with the higher op id.
 */
export class LwwMap<K, V> {
  private readonly entries = new Map<K, Entry<V>>();

  set(key: K, value: V, id: OpId): boolean {
    const existing = this.entries.get(key);
    if (existing && compareOpId(id, existing.ts) <= 0)
      return false;

    this.entries.set(key, { value, ts: id, deleted: false });
    return true;
  }

  delete(key: K, id: OpId): boolean {
    const existing = this.entries.get(key);
    if (existing && compareOpId(id, existing.ts) <= 0)
      return false;

    this.entries.set(key, { value: existing?.value as V, ts: id, deleted: true });
    return true;
  }

  get(key: K): V | undefined {
    const entry = this.entries.get(key);
    return entry && !entry.deleted ? entry.value : undefined;
  }

  has(key: K): boolean {
    const entry = this.entries.get(key);
    return entry !== undefined && !entry.deleted;
  }

  keys(): K[] {
    return [...this.entries].filter(([, entry]) => !entry.deleted).map(([key]) => key);
  }

  toEntries(): Array<[K, V]> {
    return [...this.entries].filter(([, entry]) => !entry.deleted).map(([key, entry]) => [key, entry.value]);
  }
}
