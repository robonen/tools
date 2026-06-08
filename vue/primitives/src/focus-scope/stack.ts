export interface FocusScopeAPI {
  paused: boolean;
  pause: () => void;
  resume: () => void;
}

const stack: FocusScopeAPI[] = [];

export function createFocusScopesStack() {
  return {
    add(focusScope: FocusScopeAPI) {
      const current = stack.at(-1);
      if (focusScope !== current) current?.pause();

      // Remove if already in stack (deduplicate), then push to top
      const index = stack.indexOf(focusScope);
      if (index !== -1) stack.splice(index, 1);

      stack.push(focusScope);
    },

    remove(focusScope: FocusScopeAPI) {
      const index = stack.indexOf(focusScope);
      if (index !== -1) stack.splice(index, 1);

      stack.at(-1)?.resume();
    },
  };
}
