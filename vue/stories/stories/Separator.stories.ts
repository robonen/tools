import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { Separator } from '@robonen/primitives';

const meta = {
  title: 'Layout/Separator',
  component: Separator,
  tags: ['autodocs'],
  argTypes: {
    orientation: { control: 'radio', options: ['horizontal', 'vertical'] },
    decorative: { control: 'boolean' },
  },
  args: { orientation: 'horizontal', decorative: false },
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseStyle = `
  background: #888;
  display: block;
`;
const horizontal = `${baseStyle} height: 1px; width: 100%;`;
const vertical = `${baseStyle} height: 24px; width: 1px; display: inline-block; margin: 0 0.75rem;`;

export const Horizontal: Story = {
  render: args => ({
    components: { Separator },
    setup: () => ({ args, horizontal }),
    template: `
      <div style="max-width: 320px; font-family: system-ui">
        <p style="margin:0 0 0.5rem">Section one</p>
        <Separator v-bind="args" :style="horizontal" />
        <p style="margin:0.5rem 0 0">Section two</p>
      </div>
    `,
  }),
};

export const Vertical: Story = {
  args: { orientation: 'vertical' },
  render: args => ({
    components: { Separator },
    setup: () => ({ args, vertical }),
    template: `
      <nav style="font-family: system-ui">
        <a href="#">Home</a>
        <Separator v-bind="args" :style="vertical" />
        <a href="#">About</a>
        <Separator v-bind="args" :style="vertical" />
        <a href="#">Contact</a>
      </nav>
    `,
  }),
};
