import type { ComputedRef } from 'vue';
import type { QrCode, QrCodeDataType } from '@robonen/encoding';
import type { MarkerPlacement, QrCodeRegion } from './utils';
import { useContextFactory } from '@robonen/vue';

/** Friendly error-correction level: Low (~7%), Medium (~15%), Quartile (~25%), High (~30%). */
export type QrCodeErrorCorrection = 'L' | 'M' | 'Q' | 'H';

/** Quiet-zone widths around the code, in module units. */
export interface QrCodeMargin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface QrCodeContext {
  /** The encoded matrix. Recomputed whenever the input or encoding options change. */
  qr: ComputedRef<QrCode>;
  /** Side length of the matrix in modules (21–177). */
  size: ComputedRef<number>;
  /** Resolved quiet-zone margins. */
  margin: ComputedRef<QrCodeMargin>;
  /** Top-left module index of each of the three finder patterns. */
  markers: ComputedRef<MarkerPlacement[]>;
  /** Whether the module at `(x, y)` is dark. Out-of-bounds reads return `false`. */
  isDark: (x: number, y: number) => boolean;
  /** Structural role of the module at `(x, y)`. */
  getModuleType: (x: number, y: number) => QrCodeDataType;
  /** Whether the module at `(x, y)` is covered by a reserved overlay region. */
  isReserved: (x: number, y: number) => boolean;
  /** Registers (or, with `null`, clears) a reserved region keyed by an owner symbol. */
  reserve: (owner: symbol, region: QrCodeRegion | null) => void;
  /** Removes a previously reserved region. */
  release: (owner: symbol) => void;
  /** Stable id, usable as a prefix for `clipPath`/gradient ids within the code. */
  id: ComputedRef<string>;
}

const ctx = useContextFactory<QrCodeContext>('QrCodeContext');

export const provideQrCodeContext = ctx.provide;
export const useQrCodeContext = ctx.inject;
