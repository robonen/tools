import { createFetch } from './fetch';

export { createFetch } from './fetch';
export { FetchError, createFetchError } from './error';
export { composePlugins, definePlugin, runHookPhase } from './plugin';
export type { ComposedPlugins } from './plugin';
export { retryPlugin, timeoutPlugin } from './plugins';
export {
  isPayloadMethod,
  isJSONSerializable,
  detectResponseType,
  buildURL,
  joinURL,
  callHooks,
  resolveFetchOptions,
} from './utils';
export type {
  $Fetch,
  CreateFetchOptions,
  Fetch,
  FetchContext,
  FetchErrorOptions,
  FetchExecuteMiddleware,
  FetchHook,
  FetchHooks,
  FetchOptions,
  FetchPlugin,
  FetchRequest,
  FetchResponse,
  IFetchError,
  MappedResponseType,
  MergePluginContext,
  MergePluginOptions,
  ResponseMap,
  ResponseType,
  ResolvedFetchOptions,
} from './types';

/**
 * @name $fetch
 * @category Fetch
 * @description Default $fetch instance backed by globalThis.fetch
 *
 * @example
 * const data = await $fetch<User>('https://api.example.com/users/1');
 *
 * @example
 * const user = await $fetch.post<User>('https://api.example.com/users', {
 *   body: { name: 'Alice' },
 * });
 *
 * @since 0.0.1
 */
export const $fetch = createFetch();
