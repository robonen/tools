/**
 * A position inside the document, addressed by block id + a UTF-16 character
 * offset into that block's inline content. Offsets are UTF-16 code units to line
 * up with the DOM `Selection`/`Range` API, so the view bridge maps 1:1.
 */
export interface Position {
  readonly blockId: string;
  readonly offset: number;
}

/** Construct a {@link Position}. */
export function position(blockId: string, offset: number): Position {
  return { blockId, offset };
}

/** Whether two positions address the same block and offset. */
export function positionEq(a: Position, b: Position): boolean {
  return a.blockId === b.blockId && a.offset === b.offset;
}
