/**
 * Dedicated collection namespace for the toast primitive. Used so a nested
 * collection provider between `ToastProvider` and `ToastViewport`/`ToastRoot`
 * does not shadow the toast collection.
 */
export const TOAST_COLLECTION_KEY = 'toast';
