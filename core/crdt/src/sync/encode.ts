import { VersionVector } from '../clock';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Transport-agnostic wire encoding. v1 is JSON-over-bytes — simple and
 * debuggable; a compact varint format is a later optimization with no API change.
 */
export function encodeJson(value: unknown): Uint8Array {
  return encoder.encode(JSON.stringify(value));
}

export function decodeJson<T>(bytes: Uint8Array): T {
  return JSON.parse(decoder.decode(bytes)) as T;
}

/** Encode a version vector for a "what do you have?" sync handshake. */
export function encodeStateVector(vv: VersionVector): Uint8Array {
  return encodeJson(vv.toJSON());
}

export function decodeStateVector(bytes: Uint8Array): VersionVector {
  return VersionVector.fromJSON(decodeJson(bytes));
}

/** Encode a batch of ops (the delta or a full snapshot). */
export function encodeOps<Op>(ops: readonly Op[]): Uint8Array {
  return encodeJson(ops);
}

export function decodeOps<Op>(bytes: Uint8Array): Op[] {
  return decodeJson<Op[]>(bytes);
}
