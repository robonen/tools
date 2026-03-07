import { bench, describe } from 'vitest';
import { encodeBinary, encodeSegments, encodeText, makeSegments, LOW, EccMap } from '.';

/* -- Test data -- */

const SHORT_TEXT = 'Hello';
const MEDIUM_TEXT = 'https://example.com/path?query=value&foo=bar';
const LONG_TEXT = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit.';
const NUMERIC_TEXT = '314159265358979323846264338327950288419716939937510';
const ALPHANUMERIC_TEXT = 'HELLO WORLD 12345';

const SMALL_BINARY = Array.from({ length: 32 }, (_, i) => i);
const MEDIUM_BINARY = Array.from({ length: 256 }, (_, i) => i % 256);

/* -- Precomputed segments for isolated encodeSegments benchmark -- */
const precomputedSegs = makeSegments(MEDIUM_TEXT);

/* -- encodeText benchmarks -- */

describe('encodeText', () => {
  bench('short text (5 chars)', () => {
    encodeText(SHORT_TEXT, LOW);
  });

  bench('medium text (URL ~44 chars)', () => {
    encodeText(MEDIUM_TEXT, LOW);
  });

  bench('long text (~270 chars)', () => {
    encodeText(LONG_TEXT, LOW);
  });

  bench('numeric text (50 digits)', () => {
    encodeText(NUMERIC_TEXT, LOW);
  });

  bench('alphanumeric text (17 chars)', () => {
    encodeText(ALPHANUMERIC_TEXT, LOW);
  });
});

/* -- ECC level impact -- */

describe('encodeText — ECC levels', () => {
  bench('LOW (L)', () => {
    encodeText(MEDIUM_TEXT, EccMap.L);
  });

  bench('MEDIUM (M)', () => {
    encodeText(MEDIUM_TEXT, EccMap.M);
  });

  bench('QUARTILE (Q)', () => {
    encodeText(MEDIUM_TEXT, EccMap.Q);
  });

  bench('HIGH (H)', () => {
    encodeText(MEDIUM_TEXT, EccMap.H);
  });
});

/* -- encodeBinary benchmarks -- */

describe('encodeBinary', () => {
  bench('small binary (32 bytes)', () => {
    encodeBinary(SMALL_BINARY, LOW);
  });

  bench('medium binary (256 bytes)', () => {
    encodeBinary(MEDIUM_BINARY, LOW);
  });
});

/* -- makeSegments benchmarks -- */

describe('makeSegments', () => {
  bench('numeric classification', () => {
    makeSegments(NUMERIC_TEXT);
  });

  bench('alphanumeric classification', () => {
    makeSegments(ALPHANUMERIC_TEXT);
  });

  bench('byte mode classification', () => {
    makeSegments(MEDIUM_TEXT);
  });
});

/* -- encodeSegments (pre-built segments) -- */

describe('encodeSegments', () => {
  bench('from pre-built segments', () => {
    encodeSegments(precomputedSegs, LOW);
  });
});
