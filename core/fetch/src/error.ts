import type { FetchContext, FetchErrorOptions, FetchRequest, FetchResponse, IFetchError, ResponseType } from './types';
import { omit } from '@robonen/stdlib';

/**
 * @name FetchError
 * @category Fetch
 * @description Error thrown by $fetch on network failures or non-2xx responses
 *
 * @since 0.0.1
 */
export class FetchError<T = unknown> extends Error implements IFetchError<T> {
  request: FetchRequest | undefined;
  options: FetchErrorOptions | undefined;
  response: FetchResponse<T> | undefined;
  data: T | undefined;
  status: number | undefined;
  statusText: string | undefined;
  statusCode: number | undefined;
  statusMessage: string | undefined;

  constructor(message: string) {
    super(message);
    this.name = 'FetchError';

    this.request = undefined;
    this.options = undefined;
    this.response = undefined;
    this.data = undefined;
    this.status = undefined;
    this.statusText = undefined;
    this.statusCode = undefined;
    this.statusMessage = undefined;
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
export function createFetchError<T = unknown, R extends ResponseType = ResponseType>(context: FetchContext<T, R>): FetchError<T> {
  const url
    = typeof context.request === 'string'
      ? context.request
      : context.request instanceof URL
        ? context.request.href
        : context.request.url;

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
  error.options = omit(context.options, ['onRequest', 'onRequestError', 'onResponse', 'onResponseError', 'retryDelay', 'parseResponse']);

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
