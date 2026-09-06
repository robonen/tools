import { defineBlock } from '../registry';

const LEVELS = [1, 2, 3, 4, 5, 6] as const;

export const heading = defineBlock({
  type: 'heading',
  spec: {
    content: { kind: 'text' },
    group: 'block',
    attrs: {
      level: { default: 1, validate: value => typeof value === 'number' && value >= 1 && value <= 6 },
    },
    toDOM: node => [`h${node.attrs['level'] ?? 1}`, 0],
    parseDOM: LEVELS.map(level => ({ tag: `h${level}`, attrs: { level } })),
  },
  inputRules: LEVELS.map(level => ({ match: new RegExp(`^#{${level}}\\s$`), attrs: { level } })),
  meta: {
    title: 'Heading',
    icon: 'heading',
    keywords: ['heading', 'title'],
    group: 'basic',
    description: 'A section title, levels 1–6.',
    variants: [
      { title: 'Heading 1', attrs: { level: 1 }, keywords: ['h1'], description: 'The largest section title.' },
      { title: 'Heading 2', attrs: { level: 2 }, keywords: ['h2'], description: 'A section title.' },
      { title: 'Heading 3', attrs: { level: 3 }, keywords: ['h3'], description: 'A subsection title.' },
    ],
  },
});
