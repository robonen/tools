import { describe, it, expect } from 'vitest';
import { Stack } from '.';

describe('stack', () => {
  describe('constructor', () => {
    it('create an empty stack if no initial values are provided', () => {
      const stack = new Stack<number>();

      expect(stack.length).toBe(0);
      expect(stack.isEmpty).toBe(true);
    });

    it('create a stack with the provided initial values', () => {
      const initialValues = [1, 2, 3];
      const stack = new Stack(initialValues);

      expect(stack.length).toBe(initialValues.length);
      expect(stack.peek()).toBe(initialValues.at(-1));
    });

    it('create a stack with the provided initial value', () => {
      const initialValue = 1;
      const stack = new Stack(initialValue);

      expect(stack.length).toBe(1);
      expect(stack.peek()).toBe(initialValue);
    });

    it('create a stack with the provided options', () => {
      const options = { maxSize: 5 };
      const stack = new Stack<number>(undefined, options);

      expect(stack.length).toBe(0);
      expect(stack.isFull).toBe(false);
    });
  });

  describe('push', () => {
    it('push an element onto the stack', () => {
      const stack = new Stack<number>();
      stack.push(1);

      expect(stack.length).toBe(1);
      expect(stack.peek()).toBe(1);
    });

    it('throw an error if the stack is full', () => {
      const options = { maxSize: 1 };
      const stack = new Stack<number>(undefined, options);
      stack.push(1);

      expect(() => stack.push(2)).toThrow(new RangeError('Stack is full'));
    });
  });

  describe('pop', () => {
    it('pop an element from the stack', () => {
      const stack = new Stack<number>([1, 2, 3]);
      const poppedElement = stack.pop();

      expect(poppedElement).toBe(3);
      expect(stack.length).toBe(2);
    });

    it('return undefined if the stack is empty', () => {
      const stack = new Stack<number>();
      const poppedElement = stack.pop();

      expect(poppedElement).toBeUndefined();
    });
  });

  describe('peek', () => {
    it('return the top element of the stack', () => {
      const stack = new Stack<number>([1, 2, 3]);
      const topElement = stack.peek();

      expect(topElement).toBe(3);
      expect(stack.length).toBe(3);
    });

    it('throw an error if the stack is empty', () => {
      const stack = new Stack<number>();
      expect(() => stack.peek()).toThrow(new RangeError('Stack is empty'));
    });
  });

  describe('clear', () => {
    it('clear the stack', () => {
      const stack = new Stack<number>([1, 2, 3]);
      stack.clear();

      expect(stack.length).toBe(0);
      expect(stack.isEmpty).toBe(true);
    });
  });

  describe('iteration', () => {
    it('iterate over the stack in LIFO order', () => {
      const stack = new Stack<number>([1, 2, 3]);
      const elements = [...stack];

      expect(elements).toEqual([3, 2, 1]);
    });

    it('iterate over the stack asynchronously in LIFO order', async () => {
      const stack = new Stack<number>([1, 2, 3]);
      const elements: number[] = [];

      for await (const element of stack) {
        elements.push(element);
      }
      
      expect(elements).toEqual([3, 2, 1]);
    });
  });
});