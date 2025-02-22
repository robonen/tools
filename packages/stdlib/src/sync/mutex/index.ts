/**
 * @name SyncMutex
 * @category Utils
 * @description A simple synchronous mutex to provide more readable locking and unlocking of code blocks
 * 
 * @example
 * const mutex = new SyncMutex();
 * 
 * mutex.lock();
 *
 * mutex.unlock();
 * 
 * @since 0.0.5
 */
export class SyncMutex {
  private state: boolean = false;

  public get isLocked() {
    return this.state;
  }

  public lock() {
    this.state = true;
  }

  public unlock() {
    this.state = false;
  }
}
