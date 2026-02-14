import type { MaybePromise } from '../../../types';

export type Command = {
  execute: () => void;
  undo: () => void;
};

export type AsyncCommand = {
  execute: () => MaybePromise<void>;
  undo: () => MaybePromise<void>;
};
