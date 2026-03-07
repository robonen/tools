import { describe, expect, it } from 'vitest';

import { PriorityQueue } from '.';

describe('PriorityQueue', () => {
  describe('constructor', () => {
    it('should create an empty queue', () => {
      const pq = new PriorityQueue<number>();

      expect(pq.length).toBe(0);
      expect(pq.isEmpty).toBe(true);
      expect(pq.isFull).toBe(false);
    });

    it('should create a queue from single value', () => {
      const pq = new PriorityQueue(42);

      expect(pq.length).toBe(1);
      expect(pq.peek()).toBe(42);
    });

    it('should create a queue from array', () => {
      const pq = new PriorityQueue([5, 3, 8, 1, 4]);

      expect(pq.length).toBe(5);
      expect(pq.peek()).toBe(1);
    });

    it('should throw if initial values exceed maxSize', () => {
      expect(() => new PriorityQueue([1, 2, 3], { maxSize: 2 }))
        .toThrow('Initial values exceed maxSize');
    });
  });

  describe('enqueue', () => {
    it('should enqueue elements by priority', () => {
      const pq = new PriorityQueue<number>();

      pq.enqueue(5);
      pq.enqueue(1);
      pq.enqueue(3);

      expect(pq.peek()).toBe(1);
      expect(pq.length).toBe(3);
    });

    it('should throw when queue is full', () => {
      const pq = new PriorityQueue<number>(undefined, { maxSize: 2 });

      pq.enqueue(1);
      pq.enqueue(2);

      expect(() => pq.enqueue(3)).toThrow('PriorityQueue is full');
    });
  });

  describe('dequeue', () => {
    it('should return undefined for empty queue', () => {
      const pq = new PriorityQueue<number>();

      expect(pq.dequeue()).toBeUndefined();
    });

    it('should dequeue elements in priority order (min-heap)', () => {
      const pq = new PriorityQueue([5, 3, 8, 1, 4]);
      const result: number[] = [];

      while (!pq.isEmpty) {
        result.push(pq.dequeue()!);
      }

      expect(result).toEqual([1, 3, 4, 5, 8]);
    });

    it('should dequeue elements in priority order (max-heap)', () => {
      const pq = new PriorityQueue([5, 3, 8, 1, 4], {
        comparator: (a, b) => b - a,
      });
      const result: number[] = [];

      while (!pq.isEmpty) {
        result.push(pq.dequeue()!);
      }

      expect(result).toEqual([8, 5, 4, 3, 1]);
    });
  });

  describe('peek', () => {
    it('should return undefined for empty queue', () => {
      const pq = new PriorityQueue<number>();

      expect(pq.peek()).toBeUndefined();
    });

    it('should return highest-priority element without removing', () => {
      const pq = new PriorityQueue([5, 1, 3]);

      expect(pq.peek()).toBe(1);
      expect(pq.length).toBe(3);
    });
  });

  describe('isFull', () => {
    it('should be false when no maxSize', () => {
      const pq = new PriorityQueue([1, 2, 3]);

      expect(pq.isFull).toBe(false);
    });

    it('should be true when at maxSize', () => {
      const pq = new PriorityQueue([1, 2], { maxSize: 2 });

      expect(pq.isFull).toBe(true);
    });

    it('should become false after dequeue', () => {
      const pq = new PriorityQueue([1, 2], { maxSize: 2 });

      pq.dequeue();

      expect(pq.isFull).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all elements', () => {
      const pq = new PriorityQueue([1, 2, 3]);

      const result = pq.clear();

      expect(pq.length).toBe(0);
      expect(pq.isEmpty).toBe(true);
      expect(result).toBe(pq);
    });
  });

  describe('toArray', () => {
    it('should return empty array for empty queue', () => {
      const pq = new PriorityQueue<number>();

      expect(pq.toArray()).toEqual([]);
    });

    it('should return a shallow copy', () => {
      const pq = new PriorityQueue([3, 1, 2]);
      const arr = pq.toArray();

      arr.push(99);

      expect(pq.length).toBe(3);
    });
  });

  describe('toString', () => {
    it('should return formatted string', () => {
      const pq = new PriorityQueue([1, 2, 3]);

      expect(pq.toString()).toBe('PriorityQueue(3)');
    });
  });

  describe('iterator', () => {
    it('should iterate over elements', () => {
      const pq = new PriorityQueue([5, 3, 1]);
      const elements = [...pq];

      expect(elements.length).toBe(3);
    });
  });

  describe('custom comparator', () => {
    it('should work with object priority', () => {
      interface Job {
        priority: number;
        name: string;
      }

      const pq = new PriorityQueue<Job>(
        [
          { priority: 3, name: 'low' },
          { priority: 1, name: 'critical' },
          { priority: 2, name: 'normal' },
        ],
        { comparator: (a, b) => a.priority - b.priority },
      );

      expect(pq.dequeue()?.name).toBe('critical');
      expect(pq.dequeue()?.name).toBe('normal');
      expect(pq.dequeue()?.name).toBe('low');
    });
  });

  describe('interleaved operations', () => {
    it('should maintain priority with mixed enqueue and dequeue', () => {
      const pq = new PriorityQueue<number>();

      pq.enqueue(10);
      pq.enqueue(5);
      expect(pq.dequeue()).toBe(5);

      pq.enqueue(3);
      pq.enqueue(7);
      expect(pq.dequeue()).toBe(3);

      pq.enqueue(1);
      expect(pq.dequeue()).toBe(1);
      expect(pq.dequeue()).toBe(7);
      expect(pq.dequeue()).toBe(10);
      expect(pq.dequeue()).toBeUndefined();
    });
  });
});
