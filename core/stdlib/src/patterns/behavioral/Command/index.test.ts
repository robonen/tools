import { describe, it, expect, beforeEach } from 'vitest';
import { CommandHistory, AsyncCommandHistory } from '.';
import type { Command, AsyncCommand } from '.';

describe('commandHistory', () => {
  let history: CommandHistory;
  let items: string[];

  function addItem(item: string): Command {
    return {
      execute: () => { items.push(item); },
      undo: () => { items.pop(); },
    };
  }

  beforeEach(() => {
    history = new CommandHistory();
    items = [];
  });

  describe('execute', () => {
    it('executes a command', () => {
      history.execute(addItem('a'));

      expect(items).toEqual(['a']);
    });

    it('tracks size', () => {
      history.execute(addItem('a'));
      history.execute(addItem('b'));

      expect(history.size).toBe(2);
    });

    it('clears redo stack on new execute', () => {
      history.execute(addItem('a'));
      history.undo();

      expect(history.canRedo).toBe(true);

      history.execute(addItem('b'));

      expect(history.canRedo).toBe(false);
    });
  });

  describe('undo', () => {
    it('undoes the last command', () => {
      history.execute(addItem('a'));
      history.execute(addItem('b'));
      history.undo();

      expect(items).toEqual(['a']);
    });

    it('returns true when undo was performed', () => {
      history.execute(addItem('a'));

      expect(history.undo()).toBe(true);
    });

    it('returns false when nothing to undo', () => {
      expect(history.undo()).toBe(false);
    });

    it('multiple undos', () => {
      history.execute(addItem('a'));
      history.execute(addItem('b'));
      history.execute(addItem('c'));
      history.undo();
      history.undo();
      history.undo();

      expect(items).toEqual([]);
      expect(history.canUndo).toBe(false);
    });
  });

  describe('redo', () => {
    it('redoes the last undone command', () => {
      history.execute(addItem('a'));
      history.undo();
      history.redo();

      expect(items).toEqual(['a']);
    });

    it('returns true when redo was performed', () => {
      history.execute(addItem('a'));
      history.undo();

      expect(history.redo()).toBe(true);
    });

    it('returns false when nothing to redo', () => {
      expect(history.redo()).toBe(false);
    });

    it('undo then redo multiple times', () => {
      history.execute(addItem('a'));
      history.execute(addItem('b'));
      history.undo();
      history.undo();
      history.redo();
      history.redo();

      expect(items).toEqual(['a', 'b']);
    });
  });

  describe('batch', () => {
    it('executes multiple commands', () => {
      history.batch([addItem('a'), addItem('b'), addItem('c')]);

      expect(items).toEqual(['a', 'b', 'c']);
    });

    it('undoes all batched commands in one step', () => {
      history.batch([addItem('a'), addItem('b'), addItem('c')]);
      history.undo();

      expect(items).toEqual([]);
    });

    it('counts as single history entry', () => {
      history.batch([addItem('a'), addItem('b'), addItem('c')]);

      expect(history.size).toBe(1);
    });

    it('undoes batch in reverse order', () => {
      const order: string[] = [];

      history.batch([
        { execute: () => order.push('exec-1'), undo: () => order.push('undo-1') },
        { execute: () => order.push('exec-2'), undo: () => order.push('undo-2') },
        { execute: () => order.push('exec-3'), undo: () => order.push('undo-3') },
      ]);
      history.undo();

      expect(order).toEqual(['exec-1', 'exec-2', 'exec-3', 'undo-3', 'undo-2', 'undo-1']);
    });
  });

  describe('maxSize', () => {
    it('limits undo stack', () => {
      const limited = new CommandHistory({ maxSize: 2 });
      items = [];

      limited.execute(addItem('a'));
      limited.execute(addItem('b'));
      limited.execute(addItem('c'));

      expect(limited.size).toBe(2);
      expect(limited.canUndo).toBe(true);

      limited.undo();
      limited.undo();

      expect(limited.canUndo).toBe(false);
      expect(items).toEqual(['a']);
    });
  });

  describe('clear', () => {
    it('clears all history', () => {
      history.execute(addItem('a'));
      history.execute(addItem('b'));
      history.undo();
      history.clear();

      expect(history.canUndo).toBe(false);
      expect(history.canRedo).toBe(false);
      expect(history.size).toBe(0);
    });
  });

  describe('canUndo / canRedo', () => {
    it('initially false', () => {
      expect(history.canUndo).toBe(false);
      expect(history.canRedo).toBe(false);
    });

    it('canUndo after execute', () => {
      history.execute(addItem('a'));

      expect(history.canUndo).toBe(true);
      expect(history.canRedo).toBe(false);
    });

    it('canRedo after undo', () => {
      history.execute(addItem('a'));
      history.undo();

      expect(history.canUndo).toBe(false);
      expect(history.canRedo).toBe(true);
    });
  });
});

describe('asyncCommandHistory', () => {
  let history: AsyncCommandHistory;
  let items: string[];

  function addItemAsync(item: string): AsyncCommand {
    return {
      execute: async () => {
        await new Promise((r) => setTimeout(r, 5));
        items.push(item);
      },
      undo: async () => {
        await new Promise((r) => setTimeout(r, 5));
        items.pop();
      },
    };
  }

  beforeEach(() => {
    history = new AsyncCommandHistory();
    items = [];
  });

  it('executes async command', async () => {
    await history.execute(addItemAsync('a'));

    expect(items).toEqual(['a']);
  });

  it('undoes async command', async () => {
    await history.execute(addItemAsync('a'));
    await history.undo();

    expect(items).toEqual([]);
  });

  it('redoes async command', async () => {
    await history.execute(addItemAsync('a'));
    await history.undo();
    await history.redo();

    expect(items).toEqual(['a']);
  });

  it('batches async commands', async () => {
    await history.batch([addItemAsync('a'), addItemAsync('b'), addItemAsync('c')]);

    expect(items).toEqual(['a', 'b', 'c']);
    expect(history.size).toBe(1);
  });

  it('undoes async batch', async () => {
    await history.batch([addItemAsync('a'), addItemAsync('b')]);
    await history.undo();

    expect(items).toEqual([]);
  });

  it('works with sync commands too', async () => {
    await history.execute({
      execute: () => { items.push('sync'); },
      undo: () => { items.pop(); },
    });

    expect(items).toEqual(['sync']);

    await history.undo();

    expect(items).toEqual([]);
  });

  it('respects maxSize', async () => {
    const limited = new AsyncCommandHistory({ maxSize: 2 });
    items = [];

    await limited.execute(addItemAsync('a'));
    await limited.execute(addItemAsync('b'));
    await limited.execute(addItemAsync('c'));

    expect(limited.size).toBe(2);
  });
});
