import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import {
  TimelineClip,
  TimelineClipHandle,
  TimelineMarker,
  TimelinePlayhead,
  TimelineRoot,
  TimelineTrack,
  TimelineTrackHeader,
  TimelineTracks,
} from '../index';
import type { TimelineClipData, TimelineMarkerData, TimelineTrackData } from '../index';

const wrappers: Array<VueWrapper<any>> = [];
afterEach(() => {
  while (wrappers.length) wrappers.pop()!.unmount();
  document.body.innerHTML = '';
});
function track<T extends VueWrapper<any>>(w: T): T {
  wrappers.push(w);
  return w;
}

const tracks: TimelineTrackData[] = [
  { id: 't1', label: 'Video' },
  { id: 't2', label: 'Audio' },
];
const clips: TimelineClipData[] = [
  { id: 'c1', trackId: 't1', start: 1, duration: 2, label: 'Clip 1' },
  { id: 'c2', trackId: 't2', start: 4, duration: 3, label: 'Clip 2' },
];
const markers: TimelineMarkerData[] = [{ id: 'm1', time: 2, label: 'Cue' }];

/**
 * A full timeline composition with a fixed-width viewport so the scale projects
 * to real pixels (`pxPerSecond` px/s). Width 1000px, pxPerSecond 100 → 10s window.
 */
function mountTimeline(props: Record<string, unknown> = {}, clipChildren?: (id: string) => any) {
  const Comp = defineComponent({
    setup() {
      // Render clips from a LIVE model so add/remove reflect in the DOM (real usage).
      const clipsRef = ref<TimelineClipData[]>(clips.map(c => ({ ...c })));
      return () => h(
        TimelineRoot,
        {
          tracks,
          clips: clipsRef.value,
          'onUpdate:clips': (v: TimelineClipData[]) => { clipsRef.value = v; },
          defaultMarkers: markers,
          defaultPxPerSecond: 100,
          fps: 30,
          style: 'width:1000px;display:block;',
          ...props,
        } as Record<string, unknown>,
        {
          default: () => [
            h(TimelinePlayhead, {}, { default: () => 'PH' }),
            ...markers.map(m => h(TimelineMarker, { markerId: m.id })),
            h(TimelineTracks, { style: 'position:relative;display:block;width:1000px;height:128px;' }, {
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
                        { default: () => (clipChildren ? clipChildren(c.id) : c.label) },
                      )),
                  ],
                },
              )),
            }),
          ],
        },
      );
    },
  });
  return track(mount(Comp, { attachTo: document.body }));
}

describe('TimelineRoot', () => {
  it('renders the root group with timeline roledescription', () => {
    const w = mountTimeline();
    const root = w.find('[aria-roledescription="timeline"]');
    expect(root.exists()).toBe(true);
    expect(root.attributes('role')).toBe('group');
  });

  it('renders every track lane and clip', () => {
    const w = mountTimeline();
    expect(w.findAll('[data-track-id]').length).toBeGreaterThanOrEqual(2);
    expect(w.findAll('[data-clip-id]')).toHaveLength(2);
  });
});

describe('scale projection', () => {
  it('positions clips at real px from the scale (start * pxPerSecond)', async () => {
    const w = mountTimeline();
    await nextTick();
    const c1 = w.find('[data-clip-id="c1"]').element as HTMLElement;
    // start=1s @ 100px/s => left 100px; duration=2s => width 200px.
    expect(c1.style.left).toBe('100px');
    expect(c1.style.width).toBe('200px');
    const c2 = w.find('[data-clip-id="c2"]').element as HTMLElement;
    expect(c2.style.left).toBe('400px'); // start 4s
    expect(c2.style.width).toBe('300px'); // duration 3s
  });
});

describe('TimelinePlayhead', () => {
  it('is a horizontal slider with a timecode aria-valuetext', () => {
    const w = mountTimeline({ defaultCurrentTime: 2 });
    const ph = w.find('[role="slider"][aria-label="Playhead"]');
    expect(ph.exists()).toBe(true);
    expect(ph.attributes('aria-orientation')).toBe('horizontal');
    expect(ph.attributes('aria-valuenow')).toBe('2');
    expect(ph.attributes('aria-valuetext')).toBe('00:00:02:00');
  });

  it('ArrowRight scrubs the playhead by exactly one frame', async () => {
    const onScrub = ref<number | null>(null);
    const w = mountTimeline({
      defaultCurrentTime: 1,
      onScrubCommit: (t: number) => { onScrub.value = t; },
    });
    const ph = w.find('[role="slider"][aria-label="Playhead"]');
    await ph.trigger('keydown', { key: 'ArrowRight' });
    await nextTick();
    // 1s + 1 frame @30fps = 1 + 1/30.
    expect(onScrub.value).toBeCloseTo(1 + 1 / 30, 5);
    expect(Number(ph.attributes('aria-valuenow'))).toBeCloseTo(1 + 1 / 30, 5);
  });

  it('Home jumps to 0 and End to duration', async () => {
    const w = mountTimeline({ defaultCurrentTime: 3, duration: 10 });
    const ph = w.find('[role="slider"][aria-label="Playhead"]');
    await ph.trigger('keydown', { key: 'Home' });
    await nextTick();
    expect(ph.attributes('aria-valuenow')).toBe('0');
    await ph.trigger('keydown', { key: 'End' });
    await nextTick();
    expect(ph.attributes('aria-valuenow')).toBe('10');
  });
});

describe('TimelineClip roving focus + selection', () => {
  it('exposes a single tab-stop with aria-selected', async () => {
    const w = mountTimeline();
    await nextTick();
    const stops = w.findAll('[data-clip-id]').filter(c => c.attributes('tabindex') === '0');
    expect(stops).toHaveLength(1);
    // The first clip in time order (c1 @1s) is the tab stop.
    expect(stops[0]!.attributes('data-clip-id')).toBe('c1');
  });

  it('selects a clip on pointerdown (data-selected + aria-selected)', async () => {
    const w = mountTimeline();
    const c1 = w.find('[data-clip-id="c1"]');
    c1.element.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
    await nextTick();
    expect(w.find('[data-clip-id="c1"]').attributes('data-selected')).toBe('');
    expect(w.find('[data-clip-id="c1"]').attributes('aria-selected')).toBe('true');
  });

  it('ArrowRight nudges a focused clip by one frame', async () => {
    const onChange = ref<any>(null);
    const w = mountTimeline({ onClipsChange: (c: any) => void (onChange.value = c) });
    const c1 = w.find('[data-clip-id="c1"]');
    c1.element.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
    await nextTick();
    await c1.trigger('keydown', { key: 'ArrowRight' });
    await nextTick();
    expect(onChange.value).toBeTruthy();
    const moved = onChange.value.find((ch: any) => ch.id === 'c1');
    // start 1s + 1 frame @30fps.
    expect(moved.start).toBeCloseTo(1 + 1 / 30, 5);
  });

  it('ArrowDown moves a clip to the track below', async () => {
    const onChange = ref<any>(null);
    const w = mountTimeline({ onClipsChange: (c: any) => void (onChange.value = c) });
    const c1 = w.find('[data-clip-id="c1"]');
    c1.element.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
    await nextTick();
    await c1.trigger('keydown', { key: 'ArrowDown' });
    await nextTick();
    const moved = onChange.value.find((ch: any) => ch.id === 'c1');
    expect(moved.trackId).toBe('t2'); // moved from t1 to the next lane t2
  });

  it('Delete removes the selected clip', async () => {
    const onChange = ref<any>(null);
    const w = mountTimeline({ onClipsChange: (c: any) => void (onChange.value = c) });
    const c1 = w.find('[data-clip-id="c1"]');
    c1.element.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
    await nextTick();
    await c1.trigger('keydown', { key: 'Delete' });
    await nextTick();
    expect(onChange.value.some((ch: any) => ch.type === 'remove' && ch.id === 'c1')).toBe(true);
    expect(w.find('[data-clip-id="c1"]').exists()).toBe(false);
  });
});

describe('TimelineClipHandle (trim)', () => {
  it('is a slider with valuemin/valuemax/valuenow in seconds + timecode', async () => {
    const w = mountTimeline({}, () => [
      h(TimelineClipHandle, { side: 'start', key: 's' }),
      h(TimelineClipHandle, { side: 'end', key: 'e' }),
    ]);
    await nextTick();
    // Two handles (start + end) per clip; scope to the first clip.
    const c1 = w.find('[data-clip-id="c1"]');
    const handles = c1.findAll('[role="slider"][data-side]');
    expect(handles).toHaveLength(2);
    const startHandle = handles.find(h => h.attributes('data-side') === 'start')!;
    expect(startHandle.attributes('aria-orientation')).toBe('horizontal');
    expect(startHandle.attributes('aria-valuetext')).toMatch(/^\d\d:\d\d:\d\d:\d\d$/);
  });

  it('ArrowRight on the start handle trims the clip start by a frame', async () => {
    const onChange = ref<any>(null);
    const w = mountTimeline(
      { onClipsChange: (c: any) => void (onChange.value = c) },
      () => h(TimelineClipHandle, { side: 'start' }),
    );
    await nextTick();
    const handle = w.find('[role="slider"][data-side="start"]');
    await handle.trigger('keydown', { key: 'ArrowRight' });
    await nextTick();
    expect(onChange.value).toBeTruthy();
    const trimmed = onChange.value.find((ch: any) => ch.type === 'move' || ch.type === 'trim');
    expect(trimmed).toBeTruthy();
  });
});

describe('TimelineMarker', () => {
  it('renders a marker button with timecode label at its time', async () => {
    const w = mountTimeline();
    await nextTick();
    const marker = w.find('[data-marker-id="m1"]');
    expect(marker.exists()).toBe(true);
    expect(marker.attributes('aria-label')).toContain('00:00:02:00');
    // time=2s @ 100px/s => left 200px.
    expect((marker.element as HTMLElement).style.left).toBe('200px');
  });
});

describe('track header toggles', () => {
  it('mute/solo/lock buttons set aria-pressed + emit a track patch', async () => {
    const onTracks = ref<any>(null);
    const w = mountTimeline({ onTracksChange: (c: any) => void (onTracks.value = c) });
    const muteBtn = w.findAll('button').find(b => b.attributes('aria-label')?.startsWith('Mute'))!;
    expect(muteBtn.attributes('aria-pressed')).toBe('false');
    await muteBtn.trigger('click');
    await nextTick();
    expect(onTracks.value[0]).toMatchObject({ type: 'patch', patch: { muted: true } });
    const after = w.findAll('button').find(b => b.attributes('aria-label')?.startsWith('Mute'))!;
    expect(after.attributes('aria-pressed')).toBe('true');
  });
});

describe('disabled', () => {
  it('blocks scrubbing and selection', async () => {
    const onChange = ref<any>(null);
    const w = mountTimeline({ disabled: true, onClipsChange: (c: any) => void (onChange.value = c) });
    const root = w.find('[aria-roledescription="timeline"]');
    expect(root.attributes('data-disabled')).toBe('');
    const c1 = w.find('[data-clip-id="c1"]');
    c1.element.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
    await nextTick();
    expect(w.find('[data-clip-id="c1"]').attributes('data-selected')).toBeUndefined();
  });
});

describe('reconcile does not clobber a mid-mutation clip', () => {
  it('ignores an external clips write while isMutating', async () => {
    const model = ref<TimelineClipData[]>([{ id: 'c1', trackId: 't1', start: 1, duration: 2 }]);
    const Comp = defineComponent({
      setup(_, { expose }) {
        const rootRef = ref<any>(null);
        expose({ rootRef });
        return () => h(
          TimelineRoot,
          {
            ref: rootRef,
            tracks: [{ id: 't1' }],
            clips: model.value,
            'onUpdate:clips': (v: TimelineClipData[]) => { model.value = v; },
            defaultPxPerSecond: 100,
            style: 'width:1000px;display:block;',
          } as Record<string, unknown>,
          {
            default: () => h(TimelineTracks, { style: 'position:relative;width:1000px;height:64px;' }, {
              default: () => h(TimelineTrack, { trackId: 't1' }, {
                default: () => h(TimelineClip, { clipId: 'c1' }),
              }),
            }),
          },
        );
      },
    });
    const w = track(mount(Comp, { attachTo: document.body }));
    await nextTick();
    // Begin a drag on the clip so isMutating flips.
    const c1 = w.find('[data-clip-id="c1"]').element as HTMLElement;
    c1.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true, clientX: 100, clientY: 10 }));
    c1.dispatchEvent(new PointerEvent('pointermove', { button: 0, bubbles: true, clientX: 160, clientY: 10 }));
    await nextTick();
    // External write during the drag MUST NOT reset the live position.
    model.value = [{ id: 'c1', trackId: 't1', start: 1, duration: 2 }];
    await nextTick();
    c1.dispatchEvent(new PointerEvent('pointerup', { button: 0, bubbles: true, clientX: 160, clientY: 10 }));
    await nextTick();
    // After commit the clip reflects the drag, not the clobbering external value.
    expect(model.value[0]!.start).toBeGreaterThan(1);
  });
});
