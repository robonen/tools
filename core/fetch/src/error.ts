import type { FetchContext, FetchOptions, FetchRequest, FetchResponse, IFetchError } from './types';

/**
 * @name FetchError
 * @category Fetch
 * @description Error thrown by $fetch on network failures or non-2xx responses
 *
 * @since 0.0.1
 */
export class FetchError<T = unknown> extends Error implements IFetchError<T> {
  request?: FetchRequest;
  options?: FetchOptions;
  response?: FetchResponse<T>;
  data?: T;
  status?: number;
  statusText?: string;
  statusCode?: number;
  statusMessage?: string;

  constructor(message: string) {
    super(message);
    this.name = 'FetchError';
  }
}

/**
 * @name createFetchError
 * @category Fetch
 * @description Builds a FetchError from a FetchContext, extracting URL, status, and error message
 *
 * @param {FetchContext} context - The context at the point of failure
 * @returns {FetchError} A populated FetchError instance
 *
 * @since 0.0.1
 */
export function createFetchError<T = unknown>(context: FetchContext<T>): FetchError<T> {
  const url
    = typeof context.request === 'string'
      ? context.request
      : context.request instanceof URL
        ? context.request.href
        : (context.request as Request).url;

  const statusPart = context.response
    ? `${context.response.status} ${context.response.statusText}`
    : '';

  const errorPart = context.error?.message ?? '';

  // Build message from non-empty parts
  let message = url;
  if (statusPart) message += ` ${statusPart}`;
  if (errorPart) message += `: ${errorPart}`;

  const error = new FetchError<T>(message);

  error.request = context.request;
  error.options = context.options;

  if (context.response !== undefined) {
    error.response = context.response;
    error.data = context.response._data;
    error.status = context.response.status;
    error.statusText = context.response.statusText;
    error.statusCode = context.response.status;
    error.statusMessage = context.response.statusText;
  }

  return error;
}
