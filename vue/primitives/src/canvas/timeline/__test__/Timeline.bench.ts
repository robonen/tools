import { bench, describe } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { mount } from '@vue/test-utils';
import {
  framesToTimecode,
  scaleLinear,
  secondsToFrames,
  timeTicks,
  timecodeTicks,
} from '../../../internal/scale';
import {
  TimelineClip,
  TimelinePlayhead,
  TimelineRoot,
  TimelineTrack,
  TimelineTrackHeader,
  TimelineTracks,
  applyClipChanges,
  applyTrackChanges,
  clipIntersectsTime,
  clipsDuration,
  snapToFrame,
  timeToTimecode,
} from '../index';
import type {
  TimelineClipChange,
  TimelineClipData,
  TimelineTrackChange,
  TimelineTrackData,
} from '../index';

// ─────────────────────────────────────────────────────────────────────────────
// Deterministic fixtures (NO Math.random — every value is seeded by index).
//
// The timeline domain unit is SECONDS; pxPerSecond is the zoom. The hot paths
// are (a) the pure ruler/timecode/scale math recomputed on every pan/zoom, (b)
// the controlled-mode reducers folding @clips-change / @tracks-change batches,
// and (c) mounting + updating the headless component tree with N clips.
// ─────────────────────────────────────────────────────────────────────────────

const FPS = 30;
const PX_PER_SECOND = 90; // matches the demo's default zoom.

/** Build a deterministic clip array spread across `trackCount` lanes. */
function makeClips(count: number, trackCount: number): TimelineClipData[] {
  const out: TimelineClipData[] = [];
  for (let i = 0; i < count; i++) {
    // Stagger starts so clips tile along time; vary duration by a fixed cycle.
    const start = i * 1.5;
    const duration = 0.5 + (i % 5) * 0.4;
    out.push({
      id: `c${i}`,
      trackId: `t${i % trackCount}`,
      start,
      duration,
      label: `Clip ${i}`,
      color: i % 2 === 0 ? 'var(--color-accent)' : '#0ea5e9',
      locked: i % 11 === 0,
    });
  }
  return out;
}

/** Build a deterministic track array. */
function makeTracks(count: number): TimelineTrackData[] {
  const out: TimelineTrackData[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      id: `t${i}`,
      label: `Track ${i}`,
      height: 52 + (i % 3) * 6,
      kind: i % 3 === 0 ? 'audio' : 'video',
    });
  }
  return out;
}

// Pre-built fixture sets (module scope, simple loops — no randomness).
const clips100 = makeClips(100, 8);
const clips1000 = makeClips(1000, 16);

const tracks50 = makeTracks(50);
const tracks500 = makeTracks(500);

const clips50 = makeClips(50, 4);
const clips500 = makeClips(500, 8);

// A long visible time span so the tick generators emit a realistic tick count.
const SPAN_100 = clipsDuration(clips100); // ~150s
const SPAN_1000 = clipsDuration(clips1000); // ~1500s
const VIEWPORT_PX = 1200;

// Pre-built change batches for the reducers (mixed move/trim, deterministic).
function makeClipChanges(clips: TimelineClipData[], n: number): TimelineClipChange[] {
  const out: TimelineClipChange[] = [];
  for (let i = 0; i < n; i++) {
    const clip = clips[i % clips.length]!;
    if (i % 2 === 0) out.push({ type: 'move', id: clip.id, trackId: clip.trackId, start: clip.start + 0.25 });
    else out.push({ type: 'trim', id: clip.id, start: clip.start, duration: clip.duration + 0.1 });
  }
  return out;
}

const clipChanges100 = makeClipChanges(clips100, 100);
const clipChanges1000 = makeClipChanges(clips1000, 1000);

function makeTrackChanges(tracks: TimelineTrackData[], n: number): TimelineTrackChange[] {
  const out: TimelineTrackChange[] = [];
  for (let i = 0; i < n; i++) {
    const t = tracks[i % tracks.length]!;
    out.push({ type: 'patch', id: t.id, patch: { height: 60 + (i % 4) * 4, muted: i % 2 === 0 } });
  }
  return out;
}

const trackChanges50 = makeTrackChanges(tracks50, 50);
const trackChanges500 = makeTrackChanges(tracks500, 500);

// ─────────────────────────────────────────────────────────────────────────────
// 1. Ruler tick generation — runs on EVERY pan / zoom / offset change.
//    domain = [offset, offset + width / pxPerSecond] → range = [0, width].
// ─────────────────────────────────────────────────────────────────────────────

describe('ruler ticks — timecode (per pan/zoom)', () => {
  bench('timecodeTicks — 100-clip span (~150s)', () => {
    timecodeTicks({ domain: [0, SPAN_100], range: [0, SPAN_100 * PX_PER_SECOND], fps: FPS });
  });

  bench('timecodeTicks — 1000-clip span (~1500s)', () => {
    timecodeTicks({ domain: [0, SPAN_1000], range: [0, SPAN_1000 * PX_PER_SECOND], fps: FPS });
  });

  bench('timecodeTicks — wide window, fixed viewport (1200px)', () => {
    timecodeTicks({ domain: [0, SPAN_1000], range: [0, VIEWPORT_PX], fps: FPS });
  });
});

describe('ruler ticks — wall clock (per pan/zoom)', () => {
  bench('timeTicks — 100-clip span (~150s)', () => {
    timeTicks({ domain: [0, SPAN_100], range: [0, SPAN_100 * PX_PER_SECOND] });
  });

  bench('timeTicks — 1000-clip span (~1500s)', () => {
    timeTicks({ domain: [0, SPAN_1000], range: [0, SPAN_1000 * PX_PER_SECOND] });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Scale projection + timecode formatting — per clip / per tick, every render.
// ─────────────────────────────────────────────────────────────────────────────

describe('scale projection (scaleLinear over clips)', () => {
  bench('scaleLinear — project 100 clip edges', () => {
    let acc = 0;
    for (let i = 0; i < clips100.length; i++) {
      const c = clips100[i]!;
      acc += scaleLinear(c.start, 0, SPAN_100, 0, VIEWPORT_PX);
      acc += scaleLinear(c.start + c.duration, 0, SPAN_100, 0, VIEWPORT_PX);
    }
    return acc;
  });

  bench('scaleLinear — project 1000 clip edges', () => {
    let acc = 0;
    for (let i = 0; i < clips1000.length; i++) {
      const c = clips1000[i]!;
      acc += scaleLinear(c.start, 0, SPAN_1000, 0, VIEWPORT_PX);
      acc += scaleLinear(c.start + c.duration, 0, SPAN_1000, 0, VIEWPORT_PX);
    }
    return acc;
  });
});

describe('timecode formatting (per clip label)', () => {
  bench('timeToTimecode — 100 clip durations', () => {
    let len = 0;
    for (let i = 0; i < clips100.length; i++) len += timeToTimecode(clips100[i]!.duration, FPS).length;
    return len;
  });

  bench('timeToTimecode — 1000 clip durations', () => {
    let len = 0;
    for (let i = 0; i < clips1000.length; i++) len += timeToTimecode(clips1000[i]!.duration, FPS).length;
    return len;
  });

  bench('framesToTimecode — 1000 (raw, pre-converted)', () => {
    let len = 0;
    for (let i = 0; i < clips1000.length; i++) {
      const frames = secondsToFrames(clips1000[i]!.start, FPS);
      len += framesToTimecode(frames, FPS).length;
    }
    return len;
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Snap-to-frame — keyboard nudge granularity + default snap grid.
// ─────────────────────────────────────────────────────────────────────────────

describe('snapToFrame (nudge / grid granularity)', () => {
  bench('snapToFrame — 100 clip starts', () => {
    let acc = 0;
    for (let i = 0; i < clips100.length; i++) acc += snapToFrame(clips100[i]!.start + 0.017, FPS);
    return acc;
  });

  bench('snapToFrame — 1000 clip starts', () => {
    let acc = 0;
    for (let i = 0; i < clips1000.length; i++) acc += snapToFrame(clips1000[i]!.start + 0.017, FPS);
    return acc;
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Marquee hit-testing — clipIntersectsTime per clip on every marquee move.
//    Plus clipsDuration, the auto-duration recompute over the whole clip set.
// ─────────────────────────────────────────────────────────────────────────────

describe('marquee hit-test (clipIntersectsTime per pointer move)', () => {
  // A simulated marquee window sweeping a fixed sub-range of the timeline.
  const from = SPAN_100 * 0.3;
  const to = SPAN_100 * 0.6;

  bench('clipIntersectsTime — 100 clips', () => {
    let hits = 0;
    for (let i = 0; i < clips100.length; i++) if (clipIntersectsTime(clips100[i]!, from, to)) hits++;
    return hits;
  });

  bench('clipIntersectsTime — 1000 clips', () => {
    const f = SPAN_1000 * 0.3;
    const t = SPAN_1000 * 0.6;
    let hits = 0;
    for (let i = 0; i < clips1000.length; i++) if (clipIntersectsTime(clips1000[i]!, f, t)) hits++;
    return hits;
  });
});

describe('clipsDuration (auto-duration recompute)', () => {
  bench('clipsDuration — 100 clips', () => clipsDuration(clips100));
  bench('clipsDuration — 1000 clips', () => clipsDuration(clips1000));
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Controlled-mode reducers — fold a @clips-change / @tracks-change batch.
//    This is the React-Flow-style applyNodeChanges hot path.
// ─────────────────────────────────────────────────────────────────────────────

describe('applyClipChanges (controlled reducer)', () => {
  bench('applyClipChanges — 100 clips / 100 changes', () => {
    applyClipChanges(clips100, clipChanges100);
  });

  bench('applyClipChanges — 1000 clips / 1000 changes', () => {
    applyClipChanges(clips1000, clipChanges1000);
  });

  bench('applyClipChanges — 1000 clips / single move', () => {
    applyClipChanges(clips1000, [
      { type: 'move', id: 'c500', trackId: 't0', start: 999 },
    ]);
  });
});

describe('applyTrackChanges (controlled reducer)', () => {
  bench('applyTrackChanges — 50 tracks / 50 patches', () => {
    applyTrackChanges(tracks50, trackChanges50);
  });

  bench('applyTrackChanges — 500 tracks / 500 patches', () => {
    applyTrackChanges(tracks500, trackChanges500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Component mount — the full headless tree with N clips/tracks.
//    Builds a Root → Tracks → Track → Clip composition mirroring the demo, with
//    a fixed-width viewport so the scale projects to real pixels.
// ─────────────────────────────────────────────────────────────────────────────

/** A full timeline composition over a live clips model (add/remove reflects). */
function makeTimeline(tracks: TimelineTrackData[], initialClips: TimelineClipData[]) {
  return defineComponent({
    props: { pxPerSecond: { type: Number, default: PX_PER_SECOND } },
    setup(props) {
      const clipsRef = ref<TimelineClipData[]>(initialClips.map(c => ({ ...c })));
      return () => h(
        TimelineRoot,
        {
          tracks,
          clips: clipsRef.value,
          'onUpdate:clips': (v: TimelineClipData[]) => { clipsRef.value = v; },
          pxPerSecond: props.pxPerSecond,
          'onUpdate:pxPerSecond': () => {},
          fps: FPS,
          trackHeight: 56,
          style: 'width:1200px;display:block;',
        },
        {
          default: () => [
            h(TimelinePlayhead, {}, { default: () => 'PH' }),
            h(
              TimelineTracks,
              { style: 'position:relative;display:block;width:1200px;height:600px;' },
              {
                default: () => tracks.map(t => h(
                  TimelineTrack,
                  { trackId: t.id, key: t.id, style: 'position:relative;display:block;' },
                  {
                    default: () => [
                      h(TimelineTrackHeader, {}, {}),
                      ...clipsRef.value
                        .filter(c => c.trackId === t.id)
                        .map(c => h(
                          TimelineClip,
                          { clipId: c.id, key: c.id },
                          { default: () => c.label },
                        )),
                    ],
                  },
                )),
              },
            ),
          ],
        },
      );
    },
  });
}

describe('TimelineRoot — mount (full tree)', () => {
  bench('mount — 4 tracks / 50 clips', () => {
    const w = mount(makeTimeline(tracks50.slice(0, 4), clips50), { attachTo: document.body });
    w.unmount();
  });

  bench('mount — 8 tracks / 500 clips', () => {
    const w = mount(makeTimeline(tracks500.slice(0, 8), clips500), { attachTo: document.body });
    w.unmount();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Re-render after a prop change — zoom (pxPerSecond) and clip-array updates.
//    A zoom change re-projects every clip + rebuilds the ruler ticks; a clips
//    swap re-reconciles the internal shallowRef Map.
// ─────────────────────────────────────────────────────────────────────────────

describe('TimelineRoot — update after prop change', () => {
  bench('zoom change (pxPerSecond) — 8 tracks / 500 clips', async () => {
    const w = mount(makeTimeline(tracks500.slice(0, 8), clips500), { attachTo: document.body });
    await w.setProps({ pxPerSecond: PX_PER_SECOND * 2 });
    w.unmount();
  });

  bench('clips-array swap — 8 tracks / 500 clips', async () => {
    const Comp = defineComponent({
      setup() {
        const clipsRef = ref<TimelineClipData[]>(clips500.map(c => ({ ...c })));
        const tracks = tracks500.slice(0, 8);
        const swap = () => {
          // Shift every start by a frame (new objects → reconcile path).
          clipsRef.value = clipsRef.value.map(c => ({ ...c, start: c.start + 1 / FPS }));
        };
        return { clipsRef, tracks, swap };
      },
      render() {
        return h(
          TimelineRoot,
          { tracks: this.tracks, clips: this.clipsRef, pxPerSecond: PX_PER_SECOND, fps: FPS, style: 'width:1200px;display:block;' },
          {
            default: () => h(
              TimelineTracks,
              { style: 'position:relative;display:block;width:1200px;height:600px;' },
              {
                default: () => this.tracks.map(t => h(
                  TimelineTrack,
                  { trackId: t.id, key: t.id, style: 'position:relative;display:block;' },
                  {
                    default: () => this.clipsRef
                      .filter(c => c.trackId === t.id)
                      .map(c => h(TimelineClip, { clipId: c.id, key: c.id }, { default: () => c.label })),
                  },
                )),
              },
            ),
          },
        );
      },
    });
    const w = mount(Comp, { attachTo: document.body });
    (w.vm as unknown as { swap: () => void }).swap();
    await w.vm.$nextTick();
    w.unmount();
  });
});
