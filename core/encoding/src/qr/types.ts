export type QrCodeEcc = readonly [ordinal: number, formatBits: number];

export type QrSegmentMode = [
  modeBits: number,
  numBitsCharCount1: number,
  numBitsCharCount2: number,
  numBitsCharCount3: number,
];

export enum QrCodeDataType {
  Border = -1,
  Data = 0,
  Function = 1,
  Position = 2,
  Timing = 3,
  Alignment = 4,
}
