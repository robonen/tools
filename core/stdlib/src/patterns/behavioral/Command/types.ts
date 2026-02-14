import type { MaybePromise } from '../../../types';

export interface Command {
  execute: () => void;
  undo: () => void;
}

export interface AsyncCommand {
  execute: () => MaybePromise<void>;
  undo: () => MaybePromise<void>;
}
