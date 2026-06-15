import type { TimelineClip, TimelineTrack } from './utils';

/**
 * A granular track mutation, emitted via `@tracks-change` so a controlled
 * consumer can fold flag toggles (mute/lock/solo) and height resizes into its
 * own `tracks` array.
 *
 * - `patch`  — shallow-merge a partial track (flag toggles + height).
 * - `remove` — delete the track.
 * - `add`    — insert a track.
 */
export type TimelineTrackChange
  = | { type: 'patch'; id: string; patch: Partial<TimelineTrack> }
    | { type: 'remove'; id: string }
    | { type: 'add'; track: TimelineTrack; index?: number };

/**
 * Apply a batch of track changes to a tracks array, returning a NEW array (and
 * new objects only for changed tracks). Returns the SAME reference when empty.
 */
export function applyTrackChanges(
  tracks: TimelineTrack[],
  changes: TimelineTrackChange[],
): TimelineTrack[] {
  if (changes.length === 0) return tracks;

  const byId = new Map(tracks.map(t => [t.id, t]));
  const removed = new Set<string>();
  const added: Array<{ item: TimelineTrack; index?: number }> = [];

  for (const change of changes) {
    switch (change.type) {
      case 'patch': {
        const track = byId.get(change.id);
        if (track) byId.set(change.id, { ...track, ...change.patch });
        break;
      }
      case 'remove':
        removed.add(change.id);
        break;
      case 'add':
        added.push({ item: change.track, index: change.index });
        break;
    }
  }

  const result = tracks
    .filter(t => !removed.has(t.id))
    .map(t => byId.get(t.id) ?? t);

  for (const { item, index } of added) {
    if (index === undefined || index >= result.length) result.push(item);
    else result.splice(index, 0, item);
  }

  return result;
}

/**
 * A granular clip mutation. `applyClipChanges` is the controlled-mode reducer:
 * bind `@clips-change` and fold the batch into your own `clips` array (mirrors
 * the React-Flow / `applyNodeChanges` pattern). Every variant is immutable —
 * only the touched clips get a new object so per-clip computeds (and `v-memo`)
 * stay effective for untouched clips.
 *
 * - `move`   — reposition `start` (and optionally cross-track via `trackId`).
 * - `trim`   — adjust `start` + `duration` (a handle drag).
 * - `split`  — cut the clip at time `at`, producing two clips (`-a` / `-b` ids).
 * - `remove` — delete the clip.
 * - `add`    — insert a clip.
 * - `select` — replace the selected-clip id set (selection state, not data).
 */
export type TimelineClipChange<Data = unknown>
  = | { type: 'move'; id: string; trackId: string; start: number }
    | { type: 'trim'; id: string; start: number; duration: number }
    | { type: 'split'; id: string; at: number }
    | { type: 'remove'; id: string }
    | { type: 'add'; clip: TimelineClip<Data>; index?: number }
    | { type: 'select'; ids: string[] };

/**
 * Suffix appended to the two halves a split produces. The original id is dropped
 * and replaced by `${id}-a` (left) and `${id}-b` (right).
 */
const SPLIT_LEFT = '-a';
const SPLIT_RIGHT = '-b';

/**
 * Apply a batch of clip changes to a clips array, returning a NEW array (and new
 * objects only for changed clips — untouched clips keep identity). Returns the
 * SAME array reference when `changes` is empty.
 *
 * `select` changes carry no data payload so they are a no-op here (selection is
 * Root state, not part of the clip model); the reducer accepts them so a mixed
 * batch can be folded in one call.
 *
 * Order of operations within the batch: per-id patches (`move` / `trim`) and
 * `split` mutate the `byId` map; `remove` collects ids; `add` is appended after
 * filtering — matching `applyNodeChanges` semantics.
 */
export function applyClipChanges<Data = unknown>(
  clips: Array<TimelineClip<Data>>,
  changes: Array<TimelineClipChange<Data>>,
): Array<TimelineClip<Data>> {
  if (changes.length === 0) return clips;

  const byId = new Map(clips.map(c => [c.id, c]));
  const removed = new Set<string>();
  const added: Array<{ item: TimelineClip<Data>; index?: number }> = [];
  // Splits remove the source clip and insert its two halves where the source was;
  // tracked here so ordering stays stable rather than appending to the end.
  const splits = new Map<string, [TimelineClip<Data>, TimelineClip<Data>]>();
  // Did any data-affecting change land? A batch of only `select` (or no-op) changes
  // returns the SAME reference so consumers don't re-render the whole list.
  let mutated = false;

  for (const change of changes) {
    switch (change.type) {
      case 'move': {
        const clip = byId.get(change.id);
        if (clip) {
          byId.set(change.id, { ...clip, start: change.start, trackId: change.trackId });
          mutated = true;
        }
        break;
      }
      case 'trim': {
        const clip = byId.get(change.id);
        // Guard the invariant: duration must stay positive.
        if (clip && change.duration > 0) {
          byId.set(change.id, { ...clip, start: change.start, duration: change.duration });
          mutated = true;
        }
        break;
      }
      case 'split': {
        const clip = byId.get(change.id);
        if (!clip) break;
        const cut = change.at;
        const leftDur = cut - clip.start;
        const rightDur = clip.start + clip.duration - cut;
        // Only a cut strictly inside the clip produces two clips.
        if (leftDur <= 0 || rightDur <= 0) break;
        const left: TimelineClip<Data> = { ...clip, id: `${clip.id}${SPLIT_LEFT}`, start: clip.start, duration: leftDur };
        const right: TimelineClip<Data> = { ...clip, id: `${clip.id}${SPLIT_RIGHT}`, start: cut, duration: rightDur };
        splits.set(change.id, [left, right]);
        mutated = true;
        break;
      }
      case 'remove':
        if (byId.has(change.id)) {
          removed.add(change.id);
          mutated = true;
        }
        break;
      case 'add':
        added.push({ item: change.clip, index: change.index });
        mutated = true;
        break;
      case 'select':
        // Selection is Root state; nothing to fold into the clip array.
        break;
    }
  }

  // Only `select` (or fully no-op) changes landed: return the original array.
  if (!mutated) return clips;

  const result: Array<TimelineClip<Data>> = [];
  for (const clip of clips) {
    if (removed.has(clip.id)) continue;
    const split = splits.get(clip.id);
    if (split) {
      result.push(split[0], split[1]);
      continue;
    }
    result.push(byId.get(clip.id) ?? clip);
  }

  for (const { item, index } of added) {
    if (index === undefined || index >= result.length) result.push(item);
    else result.splice(index, 0, item);
  }

  return result;
}
