import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { Label } from '@robonen/primitives';

const meta = {
  title: 'Forms/Label',
  component: Label,
  tags: ['autodocs'],
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { Label },
    template: `
      <div style="font-family: system-ui; display: grid; gap: 0.25rem; max-width: 300px">
        <Label for="email">Email address</Label>
        <input id="email" type="email" placeholder="you@example.com" style="padding:0.5rem;border:1px solid #888;border-radius:4px" />
      </div>
    `,
  }),
};

export const WithCheckbox: Story = {
  render: () => ({
    components: { Label },
    template: `
      <div style="font-family: system-ui">
        <Label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer">
          <input type="checkbox" />
          Subscribe to the newsletter
        </Label>
      </div>
    `,
  }),
};
