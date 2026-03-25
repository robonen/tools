import { describe, it, expect } from 'vitest';
import { CircularBuffer } from '.';

describe('circularBuffer', () => {
  describe('constructor', () => {
    it('create an empty buffer', () => {
      const buf = new CircularBuffer<number>();

      expect(buf.length).toBe(0);
      expect(buf.isEmpty).toBe(true);
      expect(buf.capacity).toBeGreaterThanOrEqual(4);
    });

    it('create a buffer with initial array', () => {
      const buf = new CircularBuffer([1, 2, 3]);

      expect(buf.length).toBe(3);
      expect(buf.peekFront()).toBe(1);
      expect(buf.peekBack()).toBe(3);
    });

    it('create a buffer with a single value', () => {
      const buf = new CircularBuffer(42);

      expect(buf.length).toBe(1);
      expect(buf.peekFront()).toBe(42);
    });

    it('create a buffer with initial capacity hint', () => {
      const buf = new CircularBuffer<number>(undefined, 32);

      expect(buf.capacity).toBe(32);
    });

    it('round capacity up to next power of two', () => {
      const buf = new CircularBuffer<number>(undefined, 5);

      expect(buf.capacity).toBe(8);
    });
  });

  describe('pushBack / popFront', () => {
    it('FIFO order', () => {
      const buf = new CircularBuffer<number>();
      buf.pushBack(1);
      buf.pushBack(2);
      buf.pushBack(3);

      expect(buf.popFront()).toBe(1);
      expect(buf.popFront()).toBe(2);
      expect(buf.popFront()).toBe(3);
    });
  });

  describe('pushFront / popBack', () => {
    it('LIFO order', () => {
      const buf = new CircularBuffer<number>();
      buf.pushFront(1);
      buf.pushFront(2);
      buf.pushFront(3);

      expect(buf.popBack()).toBe(1);
      expect(buf.popBack()).toBe(2);
      expect(buf.popBack()).toBe(3);
    });
  });

  describe('popFront', () => {
    it('return undefined if empty', () => {
      const buf = new CircularBuffer<number>();

      expect(buf.popFront()).toBeUndefined();
    });
  });

  describe('popBack', () => {
    it('return undefined if empty', () => {
      const buf = new CircularBuffer<number>();

      expect(buf.popBack()).toBeUndefined();
    });
  });

  describe('peekFront / peekBack', () => {
    it('return elements without removing', () => {
      const buf = new CircularBuffer([1, 2, 3]);

      expect(buf.peekFront()).toBe(1);
      expect(buf.peekBack()).toBe(3);
      expect(buf.length).toBe(3);
    });

    it('return undefined if empty', () => {
      const buf = new CircularBuffer<number>();

      expect(buf.peekFront()).toBeUndefined();
      expect(buf.peekBack()).toBeUndefined();
    });
  });

  describe('get', () => {
    it('access element by logical index', () => {
      const buf = new CircularBuffer([10, 20, 30]);

      expect(buf.get(0)).toBe(10);
      expect(buf.get(1)).toBe(20);
      expect(buf.get(2)).toBe(30);
    });

    it('return undefined for out-of-bounds', () => {
      const buf = new CircularBuffer([1, 2]);

      expect(buf.get(-1)).toBeUndefined();
      expect(buf.get(2)).toBeUndefined();
    });

    it('work correctly after wrap-around', () => {
      const buf = new CircularBuffer<number>(undefined, 4);

      buf.pushBack(1);
      buf.pushBack(2);
      buf.pushBack(3);
      buf.pushBack(4);
      buf.popFront();
      buf.popFront();
      buf.pushBack(5);
      buf.pushBack(6);

      expect(buf.get(0)).toBe(3);
      expect(buf.get(1)).toBe(4);
      expect(buf.get(2)).toBe(5);
      expect(buf.get(3)).toBe(6);
    });
  });

  describe('clear', () => {
    it('clear the buffer', () => {
      const buf = new CircularBuffer([1, 2, 3]);
      buf.clear();

      expect(buf.length).toBe(0);
      expect(buf.isEmpty).toBe(true);
    });

    it('return this for chaining', () => {
      const buf = new CircularBuffer([1]);

      expect(buf.clear()).toBe(buf);
    });
  });

  describe('auto-grow', () => {
    it('grow when capacity is exceeded', () => {
      const buf = new CircularBuffer<number>();
      const initialCapacity = buf.capacity;

      for (let i = 0; i < initialCapacity + 1; i++)
        buf.pushBack(i);

      expect(buf.length).toBe(initialCapacity + 1);
      expect(buf.capacity).toBe(initialCapacity * 2);
    });

    it('preserve order after grow', () => {
      const buf = new CircularBuffer<number>(undefined, 4);

      buf.pushBack(1);
      buf.pushBack(2);
      buf.popFront();
      buf.pushBack(3);
      buf.pushBack(4);
      buf.pushBack(5);
      buf.pushBack(6);

      expect(buf.toArray()).toEqual([2, 3, 4, 5, 6]);
    });
  });

  describe('wrap-around', () => {
    it('handle wrap-around correctly', () => {
      const buf = new CircularBuffer<number>(undefined, 4);

      buf.pushBack(1);
      buf.pushBack(2);
      buf.pushBack(3);
      buf.pushBack(4);
      buf.popFront();
      buf.popFront();
      buf.pushBack(5);
      buf.pushBack(6);

      expect(buf.toArray()).toEqual([3, 4, 5, 6]);
    });

    it('handle alternating front/back', () => {
      const buf = new CircularBuffer<number>();

      buf.pushFront(3);
      buf.pushBack(4);
      buf.pushFront(2);
      buf.pushBack(5);
      buf.pushFront(1);

      expect(buf.toArray()).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('toArray', () => {
    it('return elements front to back', () => {
      const buf = new CircularBuffer([1, 2, 3]);

      expect(buf.toArray()).toEqual([1, 2, 3]);
    });

    it('return empty array if empty', () => {
      const buf = new CircularBuffer<number>();

      expect(buf.toArray()).toEqual([]);
    });
  });

  describe('toString', () => {
    it('return comma-separated string', () => {
      const buf = new CircularBuffer([1, 2, 3]);

      expect(buf.toString()).toBe('1,2,3');
    });
  });

  describe('iteration', () => {
    it('iterate front to back', () => {
      const buf = new CircularBuffer([1, 2, 3]);

      expect([...buf]).toEqual([1, 2, 3]);
    });

    it('iterate asynchronously', async () => {
      const buf = new CircularBuffer([1, 2, 3]);
      const elements: number[] = [];

      for await (const element of buf)
        elements.push(element);

      expect(elements).toEqual([1, 2, 3]);
    });
  });
});
