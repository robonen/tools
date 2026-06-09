import type { MaskOptions, MaskPostprocessor } from '../types';

/**
 * Parameters for {@link maskDateOptions}.
 */
export interface MaskDateParams {
  /**
   * Segment order and separator style.
   *
   * @default 'dd/mm/yyyy'
   */
  readonly mode?: 'dd/mm/yyyy' | 'mm/dd/yyyy' | 'yyyy-mm-dd';
  /**
   * Override the separator character.
   */
  readonly separator?: string;
}

interface DateSegment {
  readonly kind: 'day' | 'month' | 'year';
  readonly length: number;
}

const DATE_SEGMENTS: Record<NonNullable<MaskDateParams['mode']>, readonly DateSegment[]> = {
  'dd/mm/yyyy': [{ kind: 'day', length: 2 }, { kind: 'month', length: 2 }, { kind: 'year', length: 4 }],
  'mm/dd/yyyy': [{ kind: 'month', length: 2 }, { kind: 'day', length: 2 }, { kind: 'year', length: 4 }],
  'yyyy-mm-dd': [{ kind: 'year', length: 4 }, { kind: 'month', length: 2 }, { kind: 'day', length: 2 }],
};

const SEGMENT_MAX: Record<DateSegment['kind'], number> = { day: 31, month: 12, year: 9999 };
const ALL_DIGITS = /^\d+$/;

function clampDateSegments(segments: readonly DateSegment[], separator: string): MaskPostprocessor {
  return (state) => {
    const parts = state.value.split(separator);

    const clamped = parts.map((part, index) => {
      const segment = segments[index];
      // Clamp only fully-typed segments so partial input (e.g. "3" → 31) isn't fought.
      if (!segment || part.length < segment.length || !ALL_DIGITS.test(part))
        return part;

      const max = SEGMENT_MAX[segment.kind];
      const value = Number(part);

      return value > max ? String(max).padStart(segment.length, '0') : part;
    });

    return { value: clamped.join(separator), selection: state.selection };
  };
}

/**
 * @name maskDateOptions
 * @category Forms
 * @description Mask options for a date. Auto-inserts separators and clamps
 * fully-typed day/month segments (day ≤ 31, month ≤ 12). No calendar/timezone
 * validation — pair with a schema for that.
 *
 * @param {MaskDateParams} [params={}] Segment order and separator
 * @returns {MaskOptions} Ready-to-use mask options
 *
 * @example
 * maskDateOptions({ mode: 'dd/mm/yyyy' });
 *
 * @since 0.0.17
 */
export function maskDateOptions(params: MaskDateParams = {}): MaskOptions {
  const mode = params.mode ?? 'dd/mm/yyyy';
  const separator = params.separator ?? (mode === 'yyyy-mm-dd' ? '-' : '/');
  const segments = DATE_SEGMENTS[mode];

  const mask: Array<RegExp | string> = [];
  segments.forEach((segment, index) => {
    if (index > 0)
      mask.push(separator);
    for (let i = 0; i < segment.length; i++)
      mask.push(/\d/);
  });

  return { mask, postprocessors: [clampDateSegments(segments, separator)] };
}
