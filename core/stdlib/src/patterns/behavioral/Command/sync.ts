import { BaseCommandHistory } from './base';
import type { Command } from './types';

/**
 * @name CommandHistory
 * @category Patterns
 * @description Command history with undo/redo/batch support
 *
 * @since 0.0.8
 */
export class CommandHistory extends BaseCommandHistory<Command> {
  execute(command: Command): void {
    command.execute();
    this.pushUndo(command);
  }

  undo(): boolean {
    const command = this.undoStack.pop();

    if (!command)
      return false;

    command.undo();
    this.moveToRedo(command);

    return true;
  }

  redo(): boolean {
    const command = this.redoStack.pop();

    if (!command)
      return false;

    command.execute();
    this.moveToUndo(command);

    return true;
  }

  batch(commands: Command[]): void {
    const macro: Command = {
      execute: () => commands.forEach(c => c.execute()),
      undo: () => {
        for (let i = commands.length - 1; i >= 0; i--)
          commands[i]!.undo();
      },
    };

    this.execute(macro);
  }
}
