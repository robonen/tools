import { describe, expect, it } from 'vitest';
import { autoscrollSpeed, boundaryY, dropIndexAt } from '../view/dnd/geometry';
import { createNode, moveBefore } from '../model';

const rows = [
  { id: 'a', top: 0, bottom: 20 },
  { id: 'b', top: 24, bottom: 44 },
  { id: 'c', top: 48, bottom: 100 },
];

describe('drop geometry', () => {
  it('maps a vertical position to the boundary nearest its midpoints', () => {
    expect(dropIndexAt(rows, -50)).toBe(0);
    expect(dropIndexAt(rows, 9)).toBe(0);
    expect(dropIndexAt(rows, 11)).toBe(1);
    expect(dropIndexAt(rows, 33)).toBe(1);
    expect(dropIndexAt(rows, 35)).toBe(2);
    expect(dropIndexAt(rows, 73)).toBe(2);
    expect(dropIndexAt(rows, 75)).toBe(3);
    expect(dropIndexAt(rows, 999)).toBe(3);
    expect(dropIndexAt([], 10)).toBe(0);
  });

  it('places the indicator at the top of the next row, or under the last', () => {
    expect(boundaryY(rows, 0)).toBe(0);
    expect(boundaryY(rows, 2)).toBe(48);
    expect(boundaryY(rows, 3)).toBe(100);
    expect(boundaryY([], 0)).toBeNull();
  });

  it('ramps autoscroll from the edge zone, up is negative', () => {
    expect(autoscrollSpeed(300, 0, 600, 40, 20)).toBe(0);
    expect(autoscrollSpeed(0, 0, 600, 40, 20)).toBe(-20);
    expect(autoscrollSpeed(20, 0, 600, 40, 20)).toBe(-10);
    expect(autoscrollSpeed(600, 0, 600, 40, 20)).toBe(20);
  });

  it('moveBefore agrees with moveBlocks on what a drop does', () => {
    const content = ['a', 'b', 'c', 'd'].map(id => createNode('paragraph', { id }));
    const order = (blocks: ReadonlyArray<{ id: string }>) => blocks.map(block => block.id);
    expect(order(moveBefore(content, ['b'], 3))).toEqual(['a', 'c', 'b', 'd']);
    expect(order(moveBefore(content, ['a', 'c'], 4))).toEqual(['b', 'd', 'a', 'c']);
    expect(order(moveBefore(content, ['d'], 0))).toEqual(['d', 'a', 'b', 'c']);
    expect(order(moveBefore(content, ['b'], 1))).toEqual(['a', 'b', 'c', 'd']);
    expect(order(moveBefore(content, ['b'], 2))).toEqual(['a', 'b', 'c', 'd']);
  });
});
