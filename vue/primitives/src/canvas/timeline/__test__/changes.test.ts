import { describe, expect, it } from 'vitest';
import type { TimelineClip, TimelineTrack } from '../utils';
import { applyClipChanges, applyTrackChanges } from '../changes';

const clips: TimelineClip[] = [
  { id: 'a', trackId: 't1', start: 0, duration: 2 },
  { id: 'b', trackId: 't1', start: 5, duration: 3 },
  { id: 'c', trackId: 't2', start: 1, duration: 4 },
];

describe('applyClipChanges', () => {
  it('returns the SAME array reference for an empty batch', () => {
    expect(applyClipChanges(clips, [])).toBe(clips);
  });

  it('moves a clip immutably, keeping untouched clips by identity', () => {
    const out = applyClipChanges(clips, [{ type: 'move', id: 'a', trackId: 't2', start: 10 }]);
    expect(out).not.toBe(clips);
    expect(out[0]).not.toBe(clips[0]); // touched clip is a new object
    expect(out[0]).toMatchObject({ id: 'a', trackId: 't2', start: 10 });
    expect(out[1]).toBe(clips[1]); // untouched identity preserved
    expect(out[2]).toBe(clips[2]);
  });

  it('trims a clip (start + duration)', () => {
    const out = applyClipChanges(clips, [{ type: 'trim', id: 'b', start: 6, duration: 2 }]);
    expect(out[1]).toMatchObject({ id: 'b', start: 6, duration: 2 });
  });

  it('rejects a trim that would make duration non-positive', () => {
    const out = applyClipChanges(clips, [{ type: 'trim', id: 'b', start: 6, duration: 0 }]);
    expect(out[1]).toBe(clips[1]); // unchanged
  });

  it('splits a clip into -a / -b halves at the cut, dropping the source', () => {
    const out = applyClipChanges(clips, [{ type: 'split', id: 'b', at: 6 }]);
    const ids = out.map(c => c.id);
    expect(ids).toEqual(['a', 'b-a', 'b-b', 'c']);
    const left = out.find(c => c.id === 'b-a')!;
    const right = out.find(c => c.id === 'b-b')!;
    expect(left).toMatchObject({ start: 5, duration: 1 });
    expect(right).toMatchObject({ start: 6, duration: 2 });
  });

  it('ignores a split outside the clip span', () => {
    const out = applyClipChanges(clips, [{ type: 'split', id: 'a', at: 9 }]);
    expect(out.map(c => c.id)).toEqual(['a', 'b', 'c']);
  });

  it('removes a clip', () => {
    const out = applyClipChanges(clips, [{ type: 'remove', id: 'a' }]);
    expect(out.map(c => c.id)).toEqual(['b', 'c']);
  });

  it('adds a clip at an index', () => {
    const out = applyClipChanges(clips, [
      { type: 'add', clip: { id: 'd', trackId: 't1', start: 9, duration: 1 }, index: 1 },
    ]);
    expect(out.map(c => c.id)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('treats select changes as a no-op on the clip array', () => {
    const out = applyClipChanges(clips, [{ type: 'select', ids: ['a', 'b'] }]);
    expect(out).toBe(clips);
  });

  it('folds a mixed batch (move + remove + add)', () => {
    const out = applyClipChanges(clips, [
      { type: 'move', id: 'a', trackId: 't1', start: 1 },
      { type: 'remove', id: 'c' },
      { type: 'add', clip: { id: 'z', trackId: 't3', start: 0, duration: 1 } },
    ]);
    expect(out.map(c => c.id)).toEqual(['a', 'b', 'z']);
    expect(out.find(c => c.id === 'a')).toMatchObject({ start: 1 });
  });
});

describe('applyTrackChanges', () => {
  const tracks: TimelineTrack[] = [
    { id: 't1', label: 'Video' },
    { id: 't2', label: 'Audio' },
  ];

  it('returns the SAME reference for an empty batch', () => {
    expect(applyTrackChanges(tracks, [])).toBe(tracks);
  });

  it('patches a track flag immutably', () => {
    const out = applyTrackChanges(tracks, [{ type: 'patch', id: 't1', patch: { muted: true } }]);
    expect(out[0]).toMatchObject({ id: 't1', muted: true });
    expect(out[1]).toBe(tracks[1]);
  });

  it('removes and adds tracks', () => {
    const removed = applyTrackChanges(tracks, [{ type: 'remove', id: 't1' }]);
    expect(removed.map(t => t.id)).toEqual(['t2']);
    const added = applyTrackChanges(tracks, [{ type: 'add', track: { id: 't3' }, index: 0 }]);
    expect(added.map(t => t.id)).toEqual(['t3', 't1', 't2']);
  });
});
