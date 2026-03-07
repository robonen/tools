/*
 * QR Code generator — core QrCode class
 *
 * Based on Project Nayuki's QR Code generator library (MIT License)
 * https://www.nayuki.io/page/qr-code-generator-library
 */

import type { QrCodeEcc } from './types';
import { QrCodeDataType } from './types';
import { ECC_CODEWORDS_PER_BLOCK, MAX_VERSION, MIN_VERSION, NUM_ERROR_CORRECTION_BLOCKS } from './constants';
import { assert, getBit, getNumDataCodewords, getNumRawDataModules } from './utils';
import { computeDivisor, computeRemainder } from '../reed-solomon';

const PENALTY_N1 = 3;
const PENALTY_N2 = 3;
const PENALTY_N3 = 40;
const PENALTY_N4 = 10;

/**
 * A QR Code symbol, which is a type of two-dimension barcode.
 * Invented by Denso Wave and described in the ISO/IEC 18004 standard.
 * Instances of this class represent an immutable square grid of dark and light cells.
 */
export class QrCode {
  /** The width and height of this QR Code, measured in modules, between 21 and 177 (inclusive). */
  public readonly size: number;

  /** The index of the mask pattern used in this QR Code, which is between 0 and 7 (inclusive). */
  public readonly mask: number;

  /** The modules of this QR Code (0 = light, 1 = dark). Flat row-major Uint8Array. */
  private readonly modules: Uint8Array;

  /** Data type of each module. Flat row-major Int8Array. */
  private readonly types: Int8Array;

  /**
   * Creates a new QR Code with the given version number, error correction level, data codeword bytes, and mask number.
   * This is a low-level API that most users should not use directly.
   */
  public constructor(
    /** The version number of this QR Code, which is between 1 and 40 (inclusive). */
    public readonly version: number,
    /** The error correction level used in this QR Code. */
    public readonly ecc: QrCodeEcc,
    dataCodewords: Readonly<number[]>,
    msk: number,
  ) {
    if (version < MIN_VERSION || version > MAX_VERSION)
      throw new RangeError('Version value out of range');
    if (msk < -1 || msk > 7)
      throw new RangeError('Mask value out of range');
    this.size = version * 4 + 17;

    const totalModules = this.size * this.size;
    this.modules = new Uint8Array(totalModules);
    this.types = new Int8Array(totalModules); // 0 = QrCodeDataType.Data

    // Compute ECC, draw modules
    this.drawFunctionPatterns();
    const allCodewords = this.addEccAndInterleave(dataCodewords);
    this.drawCodewords(allCodewords);

    // Do masking
    if (msk === -1) {
      let minPenalty = 1_000_000_000;
      for (let i = 0; i < 8; i++) {
        this.applyMask(i);
        this.drawFormatBits(i);
        const penalty = this.getPenaltyScore();
        if (penalty < minPenalty) {
          msk = i;
          minPenalty = penalty;
        }
        this.applyMask(i); // Undoes the mask due to XOR
      }
    }

    assert(msk >= 0 && msk <= 7);
    this.mask = msk;
    this.applyMask(msk);
    this.drawFormatBits(msk);
  }

  /**
   * Returns the color of the module (pixel) at the given coordinates.
   * false for light, true for dark. Out of bounds returns false (light).
   */
  public getModule(x: number, y: number): boolean {
    return x >= 0 && x < this.size && y >= 0 && y < this.size
      && this.modules[y * this.size + x] === 1;
  }

  /** Returns the data type of the module at the given coordinates. */
  public getType(x: number, y: number): QrCodeDataType {
    return this.types[y * this.size + x] as QrCodeDataType;
  }

  /* -- Private helper methods for constructor: Drawing function modules -- */

  private drawFunctionPatterns(): void {
    const size = this.size;
    // Draw horizontal and vertical timing patterns
    for (let i = 0; i < size; i++) {
      const dark = i % 2 === 0 ? 1 : 0;
      this.setFunctionModule(6, i, dark, QrCodeDataType.Timing);
      this.setFunctionModule(i, 6, dark, QrCodeDataType.Timing);
    }

    // Draw 3 finder patterns (all corners except bottom right)
    this.drawFinderPattern(3, 3);
    this.drawFinderPattern(size - 4, 3);
    this.drawFinderPattern(3, size - 4);

    // Draw numerous alignment patterns
    const alignPatPos = this.getAlignmentPatternPositions();
    const numAlign = alignPatPos.length;
    for (let i = 0; i < numAlign; i++) {
      for (let j = 0; j < numAlign; j++) {
        if (!(i === 0 && j === 0 || i === 0 && j === numAlign - 1 || i === numAlign - 1 && j === 0))
          this.drawAlignmentPattern(alignPatPos[i]!, alignPatPos[j]!);
      }
    }

    // Draw configuration data
    this.drawFormatBits(0); // Dummy mask value; overwritten later in the constructor
    this.drawVersion();
  }

  private drawFormatBits(mask: number): void {
    const data = this.ecc[1] << 3 | mask;
    let rem = data;
    for (let i = 0; i < 10; i++)
      rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = (data << 10 | rem) ^ 0x5412;
    assert(bits >>> 15 === 0);

    const size = this.size;
    // Draw first copy
    for (let i = 0; i <= 5; i++)
      this.setFunctionModule(8, i, getBit(bits, i) ? 1 : 0);
    this.setFunctionModule(8, 7, getBit(bits, 6) ? 1 : 0);
    this.setFunctionModule(8, 8, getBit(bits, 7) ? 1 : 0);
    this.setFunctionModule(7, 8, getBit(bits, 8) ? 1 : 0);
    for (let i = 9; i < 15; i++)
      this.setFunctionModule(14 - i, 8, getBit(bits, i) ? 1 : 0);

    // Draw second copy
    for (let i = 0; i < 8; i++)
      this.setFunctionModule(size - 1 - i, 8, getBit(bits, i) ? 1 : 0);
    for (let i = 8; i < 15; i++)
      this.setFunctionModule(8, size - 15 + i, getBit(bits, i) ? 1 : 0);
    this.setFunctionModule(8, size - 8, 1);
  }

  private drawVersion(): void {
    if (this.version < 7)
      return;

    let rem = this.version;
    for (let i = 0; i < 12; i++)
      rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
    const bits = this.version << 12 | rem;
    assert(bits >>> 18 === 0);

    const size = this.size;
    for (let i = 0; i < 18; i++) {
      const color = getBit(bits, i) ? 1 : 0;
      const a = size - 11 + i % 3;
      const b = (i / 3) | 0;
      this.setFunctionModule(a, b, color);
      this.setFunctionModule(b, a, color);
    }
  }

  private drawFinderPattern(x: number, y: number): void {
    const size = this.size;
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const xx = x + dx;
        const yy = y + dy;
        if (xx >= 0 && xx < size && yy >= 0 && yy < size)
          this.setFunctionModule(xx, yy, dist !== 2 && dist !== 4 ? 1 : 0, QrCodeDataType.Position);
      }
    }
  }

  private drawAlignmentPattern(x: number, y: number): void {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        this.setFunctionModule(
          x + dx,
          y + dy,
          Math.max(Math.abs(dx), Math.abs(dy)) !== 1 ? 1 : 0,
          QrCodeDataType.Alignment,
        );
      }
    }
  }

  private setFunctionModule(x: number, y: number, isDark: number, type: QrCodeDataType = QrCodeDataType.Function): void {
    const idx = y * this.size + x;
    this.modules[idx] = isDark;
    this.types[idx] = type;
  }

  /* -- Private helper methods for constructor: Codewords and masking -- */

  private addEccAndInterleave(data: Readonly<number[]>): number[] {
    const ver = this.version;
    const ecl = this.ecc;
    if (data.length !== getNumDataCodewords(ver, ecl))
      throw new RangeError('Invalid argument');

    const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[ecl[0]]![ver]!;
    const blockEccLen = ECC_CODEWORDS_PER_BLOCK[ecl[0]]![ver]!;
    const rawCodewords = (getNumRawDataModules(ver) / 8) | 0;
    const numShortBlocks = numBlocks - rawCodewords % numBlocks;
    const shortBlockLen = (rawCodewords / numBlocks) | 0;

    // Split data into blocks and append ECC to each block
    const blocks: number[][] = [];
    const rsDiv = computeDivisor(blockEccLen);
    for (let i = 0, k = 0; i < numBlocks; i++) {
      const dat: number[] = data.slice(k, k + shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1)) as number[];
      k += dat.length;
      const ecc = computeRemainder(dat, rsDiv);
      if (i < numShortBlocks)
        dat.push(0);
      blocks.push([...dat, ...ecc]);
    }

    // Interleave (not concatenate) the bytes from every block into a single sequence
    const result: number[] = [];
    const blockLen = blocks[0]!.length;
    for (let i = 0; i < blockLen; i++) {
      for (let j = 0; j < blocks.length; j++) {
        if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks)
          result.push(blocks[j]![i]!);
      }
    }
    assert(result.length === rawCodewords);
    return result;
  }

  private drawCodewords(data: Readonly<number[]>): void {
    if (data.length !== ((getNumRawDataModules(this.version) / 8) | 0))
      throw new RangeError('Invalid argument');

    const size = this.size;
    const modules = this.modules;
    const types = this.types;
    let i = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6)
        right = 5;
      for (let vert = 0; vert < size; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? size - 1 - vert : vert;
          const idx = y * size + x;
          if (types[idx] === QrCodeDataType.Data && i < data.length * 8) {
            modules[idx] = (data[i >>> 3]! >>> (7 - (i & 7))) & 1;
            i++;
          }
        }
      }
    }
    assert(i === data.length * 8);
  }

  private applyMask(mask: number): void {
    if (mask < 0 || mask > 7)
      throw new RangeError('Mask value out of range');
    const size = this.size;
    const modules = this.modules;
    const types = this.types;
    for (let y = 0; y < size; y++) {
      const yOffset = y * size;
      for (let x = 0; x < size; x++) {
        const idx = yOffset + x;
        if (types[idx] !== QrCodeDataType.Data)
          continue;
        let invert: boolean;
        switch (mask) {
          case 0: invert = (x + y) % 2 === 0; break;
          case 1: invert = y % 2 === 0; break;
          case 2: invert = x % 3 === 0; break;
          case 3: invert = (x + y) % 3 === 0; break;
          case 4: invert = (((x / 3) | 0) + ((y / 2) | 0)) % 2 === 0; break;
          case 5: invert = x * y % 2 + x * y % 3 === 0; break;
          case 6: invert = (x * y % 2 + x * y % 3) % 2 === 0; break;
          case 7: invert = ((x + y) % 2 + x * y % 3) % 2 === 0; break;
          default: throw new Error('Unreachable');
        }
        if (invert)
          modules[idx]! ^= 1;
      }
    }
  }

  private getPenaltyScore(): number {
    const size = this.size;
    const modules = this.modules;
    let result = 0;

    // Adjacent modules in row having same color, and finder-like patterns
    for (let y = 0; y < size; y++) {
      const yOffset = y * size;
      let runColor = 0;
      let runX = 0;
      let h0 = 0, h1 = 0, h2 = 0, h3 = 0, h4 = 0, h5 = 0, h6 = 0;
      for (let x = 0; x < size; x++) {
        const mod = modules[yOffset + x]!;
        if (mod === runColor) {
          runX++;
          if (runX === 5)
            result += PENALTY_N1;
          else if (runX > 5)
            result++;
        }
        else {
          // finderPenaltyAddHistory inlined
          if (h0 === 0) runX += size;
          h6 = h5; h5 = h4; h4 = h3; h3 = h2; h2 = h1; h1 = runX; h0 = runX;
          // finderPenaltyCountPatterns inlined (only when runColor is light = 0)
          if (runColor === 0) {
            const core = h1 > 0 && h2 === h1 && h3 === h1 * 3 && h4 === h1 && h5 === h1;
            if (core && h0 >= h1 * 4 && h6 >= h1) result += PENALTY_N3;
            if (core && h6 >= h1 * 4 && h0 >= h1) result += PENALTY_N3;
          }
          runColor = mod;
          runX = 1;
        }
      }
      // finderPenaltyTerminateAndCount inlined
      {
        let currentRunLength = runX;
        if (runColor === 1) {
          if (h0 === 0) currentRunLength += size;
          h6 = h5; h5 = h4; h4 = h3; h3 = h2; h2 = h1; h1 = currentRunLength; h0 = currentRunLength;
          currentRunLength = 0;
        }
        currentRunLength += size;
        if (h0 === 0) currentRunLength += size;
        h6 = h5; h5 = h4; h4 = h3; h3 = h2; h2 = h1; h1 = currentRunLength; h0 = currentRunLength;
        const core = h1 > 0 && h2 === h1 && h3 === h1 * 3 && h4 === h1 && h5 === h1;
        if (core && h0 >= h1 * 4 && h6 >= h1) result += PENALTY_N3;
        if (core && h6 >= h1 * 4 && h0 >= h1) result += PENALTY_N3;
      }
    }

    // Adjacent modules in column having same color, and finder-like patterns
    for (let x = 0; x < size; x++) {
      let runColor = 0;
      let runY = 0;
      let h0 = 0, h1 = 0, h2 = 0, h3 = 0, h4 = 0, h5 = 0, h6 = 0;
      for (let y = 0; y < size; y++) {
        const mod = modules[y * size + x]!;
        if (mod === runColor) {
          runY++;
          if (runY === 5)
            result += PENALTY_N1;
          else if (runY > 5)
            result++;
        }
        else {
          if (h0 === 0) runY += size;
          h6 = h5; h5 = h4; h4 = h3; h3 = h2; h2 = h1; h1 = runY; h0 = runY;
          if (runColor === 0) {
            const core = h1 > 0 && h2 === h1 && h3 === h1 * 3 && h4 === h1 && h5 === h1;
            if (core && h0 >= h1 * 4 && h6 >= h1) result += PENALTY_N3;
            if (core && h6 >= h1 * 4 && h0 >= h1) result += PENALTY_N3;
          }
          runColor = mod;
          runY = 1;
        }
      }
      {
        let currentRunLength = runY;
        if (runColor === 1) {
          if (h0 === 0) currentRunLength += size;
          h6 = h5; h5 = h4; h4 = h3; h3 = h2; h2 = h1; h1 = currentRunLength; h0 = currentRunLength;
          currentRunLength = 0;
        }
        currentRunLength += size;
        if (h0 === 0) currentRunLength += size;
        h6 = h5; h5 = h4; h4 = h3; h3 = h2; h2 = h1; h1 = currentRunLength; h0 = currentRunLength;
        const core = h1 > 0 && h2 === h1 && h3 === h1 * 3 && h4 === h1 && h5 === h1;
        if (core && h0 >= h1 * 4 && h6 >= h1) result += PENALTY_N3;
        if (core && h6 >= h1 * 4 && h0 >= h1) result += PENALTY_N3;
      }
    }

    // 2*2 blocks of modules having same color
    for (let y = 0; y < size - 1; y++) {
      const yOffset = y * size;
      const nextYOffset = yOffset + size;
      for (let x = 0; x < size - 1; x++) {
        const color = modules[yOffset + x]!;
        if (color === modules[yOffset + x + 1]
          && color === modules[nextYOffset + x]
          && color === modules[nextYOffset + x + 1])
          result += PENALTY_N2;
      }
    }

    // Balance of dark and light modules
    let dark = 0;
    const total = size * size;
    for (let i = 0; i < total; i++)
      dark += modules[i]!;
    const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
    assert(k >= 0 && k <= 9);
    result += k * PENALTY_N4;
    assert(result >= 0 && result <= 2568888);
    return result;
  }

  private getAlignmentPatternPositions(): number[] {
    if (this.version === 1)
      return [];

    const numAlign = ((this.version / 7) | 0)
      + 2;
    const step = (this.version === 32)
      ? 26
      : Math.ceil((this.version * 4 + 4) / (numAlign * 2 - 2)) * 2;
    const result = [6];
    for (let pos = this.size - 7; result.length < numAlign; pos -= step)
      result.splice(1, 0, pos);
    return result;
  }
}
