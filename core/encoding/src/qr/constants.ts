import type { QrCodeEcc, QrSegmentMode } from './types';

/* -- ECC Levels -- */

export const LOW: QrCodeEcc = [0, 1]; // ~7% recovery
export const MEDIUM: QrCodeEcc = [1, 0]; // ~15% recovery
export const QUARTILE: QrCodeEcc = [2, 3]; // ~25% recovery
export const HIGH: QrCodeEcc = [3, 2]; // ~30% recovery

export const EccMap = {
  L: LOW,
  M: MEDIUM,
  Q: QUARTILE,
  H: HIGH,
} as const;

/* -- Segment Modes -- */

export const MODE_NUMERIC: QrSegmentMode = [0x1, 10, 12, 14];
export const MODE_ALPHANUMERIC: QrSegmentMode = [0x2, 9, 11, 13];
export const MODE_BYTE: QrSegmentMode = [0x4, 8, 16, 16];

/* -- Version Limits -- */

export const MIN_VERSION = 1;
export const MAX_VERSION = 40;

/* -- Penalty Constants -- */

export const PENALTY_N1 = 3;
export const PENALTY_N2 = 3;
export const PENALTY_N3 = 40;
export const PENALTY_N4 = 10;

/* -- Character Sets & Patterns -- */

export const NUMERIC_REGEX = /^[0-9]*$/;
export const ALPHANUMERIC_REGEX = /^[A-Z0-9 $%*+./:_-]*$/;
export const ALPHANUMERIC_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:' as const;

/** Pre-computed charCode → alphanumeric index lookup (0xFF = invalid). O(1) instead of O(45) indexOf. */
export const ALPHANUMERIC_MAP = /* @__PURE__ */ (() => {
  const map = new Uint8Array(128).fill(0xFF);
  for (let i = 0; i < ALPHANUMERIC_CHARSET.length; i++)
    map[ALPHANUMERIC_CHARSET.charCodeAt(i)] = i;
  return map;
})();

/* -- ECC Lookup Tables -- */

// prettier-ignore
export const ECC_CODEWORDS_PER_BLOCK: number[][] = [
  //  0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30], // Low
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28], // Medium
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30], // Quartile
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30], // High
];

// prettier-ignore
export const NUM_ERROR_CORRECTION_BLOCKS: number[][] = [
  //  0, 1, 2, 3, 4, 5, 6, 7, 8, 9,10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25], // Low
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49], // Medium
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68], // Quartile
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81], // High
];
