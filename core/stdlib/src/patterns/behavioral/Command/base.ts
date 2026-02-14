/**
 * @name BaseCommandHistory
 * @category Patterns
 * @description Base class with shared undo/redo stack management
 *
 * @since 0.0.8
 */
export abstract class BaseCommandHistory<C> {
  protected undoStack: C[] = [];
  protected redoStack: C[] = [];
  protected readonly maxSize: number;

  constructor(options?: { maxSize?: number }) {
    this.maxSize = options?.maxSize ?? Infinity;
  }

  get size(): number {
    return this.undoStack.length;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }

  protected pushUndo(command: C): void {
    this.undoStack.push(command);
    this.redoStack.length = 0;

    if (this.undoStack.length > this.maxSize)
      this.undoStack.splice(0, this.undoStack.length - this.maxSize);
  }

  protected moveToRedo(command: C): void {
    this.redoStack.push(command);
  }

  protected moveToUndo(command: C): void {
    this.undoStack.push(command);
  }
}
