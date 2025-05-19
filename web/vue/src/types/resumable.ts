/**
 * Often times, we want to pause and resume a process. This is a common pattern in
 * reactive programming. This interface defines the options and actions for a resumable
 * process.
 */

/**
 * The options for a resumable process.
 * 
 * @typedef {Object} ResumableOptions
 * @property {boolean} [immediate] Whether to immediately resume the process
 * 
 */
export interface ResumableOptions {
  immediate?: boolean;
}

/**
 * The actions for a resumable process.
 * 
 * @typedef {Object} ResumableActions
 * @property {Function} resume Resumes the process
 * @property {Function} pause Pauses the process
 * @property {Function} toggle Toggles the process
 */
export interface ResumableActions {
  resume: () => void;
  pause: () => void;
  toggle: () => void;
}