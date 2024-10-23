/**
 * @name VueToolsError
 * @category Error
 * @description VueToolsError is a custom error class that represents an error in Vue Tools
 * 
 * @since 0.0.1
 */
export class VueToolsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VueToolsError';
  }
}