<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * Renders the resampled bar geometry from `WaveformRoot` as a row of elements,
 * one per bucket, each positioned and sized from the computed `buckets`. Purely
 * presentational (`role="presentation"`, `aria-hidden`) — the accessible model
 * lives on `WaveformCursor` and `WaveformRegion`. Bar heights are exposed as a
 * `0..1` fraction (via CSS custom prop `--waveform-bar`) and as an explicit
 * height percentage so consumers can style freely. Render this OR
 * `WaveformPath`, per the root's `mode`.
 */
export interface WaveformBarsProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import type { CSSProperties } from 'vue';
import { Primitive } from '../../internal/primitive';
import { useForwardExpose } from '@robonen/vue';
import { useWaveformContext } from './context';
import type { WaveformBar } from './utils';

const { as = 'div' } = defineProps<WaveformBarsProps>();
const ctx = useWaveformContext();
const { forwardRef } = useForwardExpose();

// `--waveform-bar` (a `0..1` magnitude) is exposed so consumers can style by
// amplitude. CSS custom props aren't in Vue's typed `CSSProperties`, so the
// record is assembled and cast here rather than inline in the template.
function barStyle(bar: WaveformBar): CSSProperties {
  const style = {
    position: 'absolute',
    left: `${bar.x}px`,
    width: `${bar.width}px`,
    height: `${bar.height * 100}%`,
    top: '50%',
    transform: 'translateY(-50%)',
    '--waveform-bar': String(bar.height),
  } satisfies Record<string, string>;
  return style as unknown as CSSProperties;
}
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    role="presentation"
    aria-hidden="true"
    data-waveform-bars=""
    style="position: relative;"
  >
    <slot :bars="ctx.buckets.value">
      <Primitive
        v-for="(bar, i) in ctx.buckets.value"
        :key="i"
        as="span"
        data-waveform-bar=""
        :style="barStyle(bar)"
      />
    </slot>
  </Primitive>
</template>
