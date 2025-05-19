/**
 * @name focusGuard
 * @category Browsers
 * @description Adds a pair of focus guards at the boundaries of the DOM tree to ensure consistent focus behavior
 * 
 * @param {string} namespace - The namespace to use for the guard attributes
 * @returns {Object} - An object containing the selector, createGuard, and removeGuard functions
 * 
 * @example
 * const guard = focusGuard();
 * guard.createGuard();
 * guard.removeGuard();
 * 
 * @example
 * const guard = focusGuard('focus-guard');
 * guard.createGuard();
 * guard.removeGuard();
 * 
 * @since 0.0.3
 */
export function focusGuard(namespace: string = 'focus-guard') {
  const guardAttr = `data-${namespace}`;

  const createGuard = () => {
    const edges = document.querySelectorAll(`[${guardAttr}]`);

    document.body.insertAdjacentElement('afterbegin', edges[0] ?? createGuardAttrs(guardAttr));
    document.body.insertAdjacentElement('beforeend', edges[1] ?? createGuardAttrs(guardAttr));
  };

  const removeGuard = () => {
    document.querySelectorAll(`[${guardAttr}]`).forEach((element) => element.remove());
  };

  return {
    selector: guardAttr,
    createGuard,
    removeGuard,
  };
}

export function createGuardAttrs(namespace: string) {
  const element = document.createElement('span');

  element.setAttribute(namespace, '');
  element.setAttribute('tabindex', '0');
  element.setAttribute('style', 'outline: none; opacity: 0; pointer-events: none; position: fixed;');

  return element;
}