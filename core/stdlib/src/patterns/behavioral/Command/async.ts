import { BaseCommandHistory } from './base';
import type { AsyncCommand } from './types';

/**
 * @name AsyncCommandHistory
 * @category Patterns
 * @description Async command history with undo/redo/batch support
 *
 * @since 0.0.8
 */
export class AsyncCommandHistory extends BaseCommandHistory<AsyncCommand> {
  async execute(command: AsyncCommand): Promise<void> {
    await command.execute();
    this.pushUndo(command);
  }

  async undo(): Promise<boolean> {
    const command = this.undoStack.pop();

    if (!command)
      return false;

    await command.undo();
    this.moveToRedo(command);

    return true;
  }

  async redo(): Promise<boolean> {
    const command = this.redoStack.pop();

    if (!command)
      return false;

    await command.execute();
    this.moveToUndo(command);

    return true;
  }

  async batch(commands: AsyncCommand[]): Promise<void> {
    const macro: AsyncCommand = {
      execute: async () => {
        for (const c of commands)
          await c.execute();
      },
      undo: async () => {
        for (let i = commands.length - 1; i >= 0; i--)
          await commands[i]!.undo();
      },
    };

    await this.execute(macro);
  }
}
