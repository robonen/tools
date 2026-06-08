/*
 * Reed-Solomon error correction over GF(2^8/0x11D)
 *
 * Based on Project Nayuki's QR Code generator library (MIT License)
 * https://www.nayuki.io/page/qr-code-generator-library
 */

/* -- GF(2^8) exp/log lookup tables (generator α=0x02, primitive polynomial 0x11D) -- */

const GF_EXP = new Uint8Array(256);
const GF_LOG = new Uint8Array(256);

{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x = (x << 1) ^ ((x >>> 7) * 0x11D);
  }
  GF_EXP[255] = GF_EXP[0]!;
}

/**
 * Returns the product of the two given field elements modulo GF(2^8/0x11D).
 * The arguments and result are unsigned 8-bit integers.
 */
export function multiply(x: number, y: number): number {
  if (x >>> 8 !== 0 || y >>> 8 !== 0)
    throw new RangeError('Byte out of range');

  if (x === 0 || y === 0)
    return 0;

  return GF_EXP[(GF_LOG[x]! + GF_LOG[y]!) % 255]!;
}

/**
 * Returns a Reed-Solomon ECC generator polynomial for the given degree.
 *
 * Polynomial coefficients are stored from highest to lowest power, excluding the leading term which is always 1.
 * For example the polynomial x^3 + 255x^2 + 8x + 93 is stored as the uint8 array [255, 8, 93].
 */
export function computeDivisor(degree: number): Uint8Array {
  if (degree < 1 || degree > 255)
    throw new RangeError('Degree out of range');

  const result = new Uint8Array(degree);
  result[degree - 1] = 1;

  // Compute the product polynomial (x - r^0) * (x - r^1) * ... * (x - r^{degree-1}),
  // dropping the leading term which is always 1x^degree.
  // r = 0x02, a generator element of GF(2^8/0x11D).
  let root = 0; // GF_LOG[1] = 0, i.e. α^0 = 1
  for (let i = 0; i < degree; i++) {
    // Multiply the current product by (x - r^i)
    for (let j = 0; j < degree; j++) {
      // result[j] = multiply(result[j], α^root) — inlined for performance
      if (result[j] !== 0)
        result[j] = GF_EXP[(GF_LOG[result[j]!]! + root) % 255]!;
      if (j + 1 < degree)
        result[j]! ^= result[j + 1]!;
    }
    root = (root + 1) % 255; // root tracks log(α^i) = i mod 255
  }

  return result;
}

/**
 * Returns the Reed-Solomon error correction codeword for the given data and divisor polynomials.
 */
export function computeRemainder(data: ArrayLike<number>, divisor: Uint8Array): Uint8Array {
  const len = divisor.length;
  const result = new Uint8Array(len);

  for (let d = 0, dLen = data.length; d < dLen; d++) {
    const factor = data[d]! ^ result[0]!;
    // Shift left by 1 position (native memcpy)
    result.copyWithin(0, 1);
    result[len - 1] = 0;
    // XOR with divisor scaled by factor — inlined GF multiply for performance
    if (factor !== 0) {
      const logFactor = GF_LOG[factor]!;
      for (let i = 0; i < len; i++) {
        if (divisor[i] !== 0)
          result[i]! ^= GF_EXP[(GF_LOG[divisor[i]!]! + logFactor) % 255]!;
      }
    }
  }

  return result;
}
