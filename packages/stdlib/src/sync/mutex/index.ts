import type { MaybePromise } from "../../types";

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
 * const result = await mutex.execute(() => {
 *  // do something
 *  return Promise.resolve('done');  
 * });
 * 
 * @since 0.0.5
 */
export class SyncMutex {
  private state = false;

  public get isLocked() {
    return this.state;
  }

  public lock() {
    this.state = true;
  }

  public unlock() {
    this.state = false;
  }

  public async execute<T>(callback: () => T) {
    if (this.isLocked)
      return;

    this.lock();
    const result = await callback();
    this.unlock();

    return result;
  }
}
