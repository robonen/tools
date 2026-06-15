import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { afterEach, describe, expect, it } from 'vitest';

// Smoke test: every new media-editor `demo.vue` must MOUNT without throwing
// (catches context-consumed-outside-its-Root, null-ref api calls at setup, and
// other runtime breakage that type-checking / SFC-parsing do not surface).
import AlphaSliderDemo from '../color/alpha-slider/demo.vue';
import AngleDialDemo from '../canvas/angle-dial/demo.vue';
import CanvasStageDemo from '../canvas/canvas-stage/demo.vue';
import ColorAreaDemo from '../color/color-area/demo.vue';
import ColorFieldDemo from '../color/color-field/demo.vue';
import CompareSliderDemo from '../canvas/compare-slider/demo.vue';
import CropDemo from '../canvas/crop/demo.vue';
import CurveEditorDemo from '../canvas/curve-editor/demo.vue';
import GradientEditorDemo from '../canvas/gradient-editor/demo.vue';
import HistogramDemo from '../canvas/histogram/demo.vue';
import HueSliderDemo from '../color/hue-slider/demo.vue';
import KeyframeTrackDemo from '../canvas/keyframe-track/demo.vue';
import LevelsDemo from '../canvas/levels/demo.vue';
import TimeRulerDemo from '../canvas/time-ruler/demo.vue';
import TimelineDemo from '../canvas/timeline/demo.vue';
import TransformBoxDemo from '../canvas/transform-box/demo.vue';
import WaveformDemo from '../canvas/waveform/demo.vue';
import ZoomPanDemo from '../canvas/zoom-pan/demo.vue';

const demos: Record<string, unknown> = {
  'alpha-slider': AlphaSliderDemo,
  'angle-dial': AngleDialDemo,
  'canvas-stage': CanvasStageDemo,
  'color-area': ColorAreaDemo,
  'color-field': ColorFieldDemo,
  'compare-slider': CompareSliderDemo,
  crop: CropDemo,
  'curve-editor': CurveEditorDemo,
  'gradient-editor': GradientEditorDemo,
  histogram: HistogramDemo,
  'hue-slider': HueSliderDemo,
  'keyframe-track': KeyframeTrackDemo,
  levels: LevelsDemo,
  'time-ruler': TimeRulerDemo,
  timeline: TimelineDemo,
  'transform-box': TransformBoxDemo,
  waveform: WaveformDemo,
  'zoom-pan': ZoomPanDemo,
};

const wrappers: Array<VueWrapper<any>> = [];
afterEach(() => {
  while (wrappers.length) wrappers.pop()!.unmount();
  document.body.innerHTML = '';
});

describe('media-editor demos mount without error or Vue warnings', () => {
  for (const [name, Comp] of Object.entries(demos)) {
    it(`${name}/demo.vue mounts cleanly`, async () => {
      // Collect Vue warnings (e.g. slot-prop-out-of-scope, missing context,
      // unknown template refs) instead of letting them slip to console.
      const warnings: string[] = [];
      const wrapper = mount(Comp as any, {
        attachTo: document.body,
        global: { config: { warnHandler: (msg: string) => { warnings.push(msg); } } },
      });
      wrappers.push(wrapper);
      await nextTick();
      expect(wrapper.html().length).toBeGreaterThan(0);
      expect(warnings, `Vue warnings in ${name}/demo.vue:\n${warnings.join('\n')}`).toEqual([]);
    });
  }
});
