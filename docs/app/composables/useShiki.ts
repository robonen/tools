import { createHighlighter, type Highlighter } from 'shiki';

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['github-light', 'github-dark'],
      langs: ['typescript', 'vue', 'json', 'bash'],
    });
  }
  return highlighterPromise;
}

export function useShiki() {
  const highlighted = ref<string>('');
  const isReady = ref(false);

  async function highlight(code: string, lang: string = 'typescript'): Promise<string> {
    const highlighter = await getHighlighter();
    return highlighter.codeToHtml(code, {
      lang,
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
    });
  }

  async function highlightReactive(code: string, lang: string = 'typescript'): Promise<void> {
    highlighted.value = await highlight(code, lang);
    isReady.value = true;
  }

  return {
    highlight,
    highlighted,
    highlightReactive,
    isReady,
  };
}
