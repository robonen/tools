import { ref } from 'vue';

const isUsingKeyboard = ref(false);
let initialized = false;

function init() {
  if (initialized || typeof document === 'undefined') return;
  initialized = true;
  document.addEventListener('keydown', () => {
    isUsingKeyboard.value = true;
  }, { capture: true, passive: true });
  document.addEventListener('pointerdown', () => {
    isUsingKeyboard.value = false;
  }, { capture: true, passive: true });
  document.addEventListener('pointermove', () => {
    isUsingKeyboard.value = false;
  }, { capture: true, passive: true });
}

export function useIsUsingKeyboard() {
  init();
  return isUsingKeyboard;
}
