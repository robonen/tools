import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { retry } from '.';

describe('retry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('return the result on first successful attempt', async () => {
    const successFn = vi.fn().mockResolvedValue('success');
    
    const result = await retry(successFn);

    expect(result).toBe('success');
    expect(successFn).toHaveBeenCalledTimes(1);
    expect(successFn).toHaveBeenCalledWith({ count: 1, stop: expect.any(Function) });
  });

    it('use default times value of 2', async () => {
    const failingFn = vi.fn().mockRejectedValue(new Error('Test error'));
    
    await expect(retry(failingFn)).rejects.toThrow('Test error');
    
    expect(failingFn).toHaveBeenCalledTimes(2);
  });

  it('retry the specified number of times on failure', async () => {
    const failingFn = vi.fn().mockRejectedValue(new Error('Test error'));
    
    await expect(retry(failingFn, { times: 3 })).rejects.toThrow('Test error');
    
    expect(failingFn).toHaveBeenCalledTimes(3);
    expect(failingFn).toHaveBeenNthCalledWith(1, { count: 1, stop: expect.any(Function) });
    expect(failingFn).toHaveBeenNthCalledWith(2, { count: 2, stop: expect.any(Function) });
    expect(failingFn).toHaveBeenNthCalledWith(3, { count: 3, stop: expect.any(Function) });
  });

  it('succeed on the last attempt', async () => {
    const partiallyFailingFn = vi.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockRejectedValueOnce(new Error('Second failure'))
      .mockResolvedValue('success');
    
    const result = await retry(partiallyFailingFn, { times: 3 });

    expect(result).toBe('success');
    expect(partiallyFailingFn).toHaveBeenCalledTimes(3);
  });

  it('use custom shouldRetry function', async () => {
    const networkError = new Error('Network failed');
    networkError.name = 'NetworkError';
    const failingFn = vi.fn().mockRejectedValue(networkError);
    
    await expect(retry(failingFn, { 
      times: 3,
      shouldRetry: (error) => error.name !== 'NetworkError'
    })).rejects.toThrow('Network failed');
    
    expect(failingFn).toHaveBeenCalledTimes(1);
  });

  it('retry with custom shouldRetry based on count', async () => {
    const testError = new Error('Test error');
    const failingFn = vi.fn().mockRejectedValue(testError);
    
    await expect(retry(failingFn, { 
      times: 5,
      shouldRetry: (error, count) => count < 3 // Only retry first 2 attempts
    })).rejects.toThrow('Test error');
    
    expect(failingFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('retry specific error types with custom shouldRetry', async () => {
    const temporaryError = new Error('Temporary failure');
    temporaryError.name = 'TemporaryError';
    const permanentError = new Error('Permanent failure');
    permanentError.name = 'PermanentError';
    
    const failingFn = vi.fn()
      .mockRejectedValueOnce(temporaryError)
      .mockRejectedValueOnce(temporaryError)
      .mockRejectedValueOnce(permanentError);
    
    await expect(retry(failingFn, { 
      times: 5,
      shouldRetry: (error) => error.name === 'TemporaryError'
    })).rejects.toThrow('Permanent failure');
    
    expect(failingFn).toHaveBeenCalledTimes(3);
  });

  it('wait for the specified delay between retries', async () => {
    const failingFn = vi.fn().mockRejectedValue(new Error('Test error'));

    const retryPromise = retry(failingFn, { times: 3, delay: 1000 });
    
    // First call should happen immediately
    expect(failingFn).toHaveBeenCalledTimes(1);
    
    // Advance time to trigger first retry
    await vi.advanceTimersByTimeAsync(1000);
    expect(failingFn).toHaveBeenCalledTimes(2);
    
    // Advance time to trigger second retry
    await vi.advanceTimersByTimeAsync(1000);
    expect(failingFn).toHaveBeenCalledTimes(3);
    
    await expect(retryPromise).rejects.toThrow('Test error');
  });

  it('use dynamic delay function', async () => {
    const failingFn = vi.fn().mockRejectedValue(new Error('Test error'));
    const delayFn = vi.fn((count: number) => count * 500);
    
    const retryPromise = retry(failingFn, { times: 3, delay: delayFn });
    
    // First call should happen immediately
    expect(failingFn).toHaveBeenCalledTimes(1);
    
    // First retry should wait for delay(2) = 1000ms
    await vi.advanceTimersByTimeAsync(1000);
    expect(failingFn).toHaveBeenCalledTimes(2);
    expect(delayFn).toHaveBeenCalledWith(2);
    
    // Second retry should wait for delay(3) = 1500ms
    await vi.advanceTimersByTimeAsync(1500);
    expect(failingFn).toHaveBeenCalledTimes(3);
    expect(delayFn).toHaveBeenCalledWith(3);
    
    await expect(retryPromise).rejects.toThrow('Test error');
  });

  it('not delay after the last attempt', async () => {
    const failingFn = vi.fn().mockRejectedValue(new Error('Test error'));
    
    const retryPromise = retry(failingFn, { times: 2, delay: 1000 });
    
    // Wait for the first retry delay
    await vi.advanceTimersByTimeAsync(1000);
    
    // Should complete without further delays
    await expect(retryPromise).rejects.toThrow('Test error');
    expect(failingFn).toHaveBeenCalledTimes(2);
  });

  it('handle zero delay', async () => {
    const failingFn = vi.fn().mockRejectedValue(new Error('Test error'));
    
    await expect(retry(failingFn, { times: 3, delay: 0 })).rejects.toThrow('Test error');
    
    expect(failingFn).toHaveBeenCalledTimes(3);
  });

  it('pass the count parameter to the function', async () => {
    const countingFn = vi.fn(async ({ count }: { count: number }) => {
      if (count < 3) {
        throw new Error(`Attempt ${count} failed`);
      }
      return `Success on attempt ${count}`;
    });
    
    const result = await retry(countingFn, { times: 3 });

    expect(result).toBe('Success on attempt 3');
    expect(countingFn).toHaveBeenCalledWith({ count: 1, stop: expect.any(Function) });
    expect(countingFn).toHaveBeenCalledWith({ count: 2, stop: expect.any(Function) });
    expect(countingFn).toHaveBeenCalledWith({ count: 3, stop: expect.any(Function) });
  });

  it('throw the last error when all attempts fail', async () => {
    const firstError = new Error('First error');
    const lastError = new Error('Last error');
    const failingFn = vi.fn()
      .mockRejectedValueOnce(firstError)
      .mockRejectedValueOnce(lastError);
    
    await expect(retry(failingFn, { times: 2 })).rejects.toThrow('Last error');
  });

  it('handle times value of 1', async () => {
    const failingFn = vi.fn().mockRejectedValue(new Error('Test error'));
    
    await expect(retry(failingFn, { times: 1 })).rejects.toThrow('Test error');
    
    expect(failingFn).toHaveBeenCalledTimes(1);
  });

  it('handle function that returns non-promise values', async () => {
    const syncFn = vi.fn(async ({ count }: { count: number }) => {
      if (count === 1) {
        throw new Error('First attempt failed');
      }
      return 'success';
    });
    
    const result = await retry(syncFn, { times: 2 });

    expect(result).toBe('success');
    expect(syncFn).toHaveBeenCalledTimes(2);
  });

  it('handle complex return types', async () => {
    const complexFn = vi.fn().mockResolvedValue({ 
      data: [1, 2, 3], 
      status: 'ok',
      metadata: { timestamp: 123456 }
    });
    
    const result = await retry(complexFn);

    expect(result).toEqual({
      data: [1, 2, 3],
      status: 'ok',
      metadata: { timestamp: 123456 }
    });
  });

  it('stop retrying when stop function is called', async () => {
    const customError = new Error('Custom stop error');
    const stopFn = vi.fn(async ({ count, stop }: { count: number, stop: (error: any) => void }) => {
      if (count === 2) {
        stop(customError);
      }
      throw new Error(`Attempt ${count} failed`);
    });
    
    await expect(retry(stopFn, { times: 5 })).rejects.toThrow('Custom stop error');
    
    expect(stopFn).toHaveBeenCalledTimes(2);
  });

  it('stop retrying with undefined error when stop is called without argument', async () => {
    const stopFn = vi.fn(async ({ count, stop }: { count: number, stop: (error?: any) => void }) => {
      if (count === 2) {
        stop();
      }
      throw new Error(`Attempt ${count} failed`);
    });
    
    await expect(retry(stopFn, { times: 5 })).rejects.toBeUndefined();
    
    expect(stopFn).toHaveBeenCalledTimes(2);
  });
});
