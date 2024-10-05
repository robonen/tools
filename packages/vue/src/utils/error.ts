export class VueToolsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VueToolsError';
  }
}