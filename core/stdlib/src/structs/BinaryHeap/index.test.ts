import { describe, expect, it } from 'vitest';

import { BinaryHeap } from '.';

describe('BinaryHeap', () => {
  describe('constructor', () => {
    it('should create an empty heap', () => {
      const heap = new BinaryHeap<number>();

      expect(heap.length).toBe(0);
      expect(heap.isEmpty).toBe(true);
    });

    it('should create a heap from single value', () => {
      const heap = new BinaryHeap(42);

      expect(heap.length).toBe(1);
      expect(heap.peek()).toBe(42);
    });

    it('should create a heap from array (heapify)', () => {
      const heap = new BinaryHeap([5, 3, 8, 1, 4]);

      expect(heap.length).toBe(5);
      expect(heap.peek()).toBe(1);
    });

    it('should accept a custom comparator for max-heap', () => {
      const heap = new BinaryHeap([5, 3, 8, 1, 4], {
        comparator: (a, b) => b - a,
      });

      expect(heap.peek()).toBe(8);
    });
  });

  describe('push', () => {
    it('should insert elements maintaining heap property', () => {
      const heap = new BinaryHeap<number>();

      heap.push(5);
      heap.push(3);
      heap.push(8);
      heap.push(1);

      expect(heap.peek()).toBe(1);
      expect(heap.length).toBe(4);
    });

    it('should handle duplicate values', () => {
      const heap = new BinaryHeap<number>();

      heap.push(3);
      heap.push(3);
      heap.push(3);

      expect(heap.length).toBe(3);
      expect(heap.peek()).toBe(3);
    });
  });

  describe('pop', () => {
    it('should return undefined for empty heap', () => {
      const heap = new BinaryHeap<number>();

      expect(heap.pop()).toBeUndefined();
    });

    it('should extract elements in min-heap order', () => {
      const heap = new BinaryHeap([5, 3, 8, 1, 4, 2, 7, 6]);
      const sorted: number[] = [];

      while (!heap.isEmpty) {
        sorted.push(heap.pop()!);
      }

      expect(sorted).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });

    it('should extract elements in max-heap order with custom comparator', () => {
      const heap = new BinaryHeap([5, 3, 8, 1, 4], {
        comparator: (a, b) => b - a,
      });
      const sorted: number[] = [];

      while (!heap.isEmpty) {
        sorted.push(heap.pop()!);
      }

      expect(sorted).toEqual([8, 5, 4, 3, 1]);
    });

    it('should handle single element', () => {
      const heap = new BinaryHeap(42);

      expect(heap.pop()).toBe(42);
      expect(heap.isEmpty).toBe(true);
    });
  });

  describe('peek', () => {
    it('should return undefined for empty heap', () => {
      const heap = new BinaryHeap<number>();

      expect(heap.peek()).toBeUndefined();
    });

    it('should return root without removing it', () => {
      const heap = new BinaryHeap([5, 3, 1]);

      expect(heap.peek()).toBe(1);
      expect(heap.length).toBe(3);
    });
  });

  describe('clear', () => {
    it('should remove all elements', () => {
      const heap = new BinaryHeap([1, 2, 3]);

      const result = heap.clear();

      expect(heap.length).toBe(0);
      expect(heap.isEmpty).toBe(true);
      expect(result).toBe(heap);
    });
  });

  describe('toArray', () => {
    it('should return empty array for empty heap', () => {
      const heap = new BinaryHeap<number>();

      expect(heap.toArray()).toEqual([]);
    });

    it('should return a shallow copy', () => {
      const heap = new BinaryHeap([3, 1, 2]);
      const arr = heap.toArray();

      arr.push(99);

      expect(heap.length).toBe(3);
    });
  });

  describe('toString', () => {
    it('should return formatted string', () => {
      const heap = new BinaryHeap([1, 2, 3]);

      expect(heap.toString()).toBe('BinaryHeap(3)');
    });
  });

  describe('iterator', () => {
    it('should iterate over heap elements', () => {
      const heap = new BinaryHeap([5, 3, 8, 1]);
      const elements = [...heap];

      expect(elements.length).toBe(4);
      expect(elements[0]).toBe(1);
    });
  });

  describe('custom comparator', () => {
    it('should work with string length comparator', () => {
      const heap = new BinaryHeap(['banana', 'apple', 'kiwi', 'fig'], {
        comparator: (a, b) => a.length - b.length,
      });

      expect(heap.pop()).toBe('fig');
      expect(heap.pop()).toBe('kiwi');
    });

    it('should work with object comparator', () => {
      interface Task {
        priority: number;
        name: string;
      }

      const heap = new BinaryHeap<Task>(
        [
          { priority: 3, name: 'low' },
          { priority: 1, name: 'high' },
          { priority: 2, name: 'medium' },
        ],
        { comparator: (a, b) => a.priority - b.priority },
      );

      expect(heap.pop()?.name).toBe('high');
      expect(heap.pop()?.name).toBe('medium');
      expect(heap.pop()?.name).toBe('low');
    });
  });

  describe('heapify', () => {
    it('should correctly heapify large arrays', () => {
      const values = Array.from({ length: 1000 }, () => Math.random() * 1000 | 0);
      const heap = new BinaryHeap(values);
      const sorted: number[] = [];

      while (!heap.isEmpty) {
        sorted.push(heap.pop()!);
      }

      const expected = [...values].sort((a, b) => a - b);

      expect(sorted).toEqual(expected);
    });
  });

  describe('interleaved operations', () => {
    it('should maintain heap property with mixed push and pop', () => {
      const heap = new BinaryHeap<number>();

      heap.push(10);
      heap.push(5);
      expect(heap.pop()).toBe(5);

      heap.push(3);
      heap.push(7);
      expect(heap.pop()).toBe(3);

      heap.push(1);
      expect(heap.pop()).toBe(1);
      expect(heap.pop()).toBe(7);
      expect(heap.pop()).toBe(10);
      expect(heap.pop()).toBeUndefined();
    });
  });
});
