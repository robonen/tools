import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { Toggle } from '@robonen/primitives';

const meta = {
  title: 'Forms/Toggle',
  component: Toggle,
  tags: ['autodocs'],
  argTypes: { disabled: { control: 'boolean' }, defaultPressed: { control: 'boolean' } },
  args: { disabled: false, defaultPressed: false },
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

const template = `
  <Toggle v-bind="args" class="sb-toggle">
    <template #default="{ pressed }">{{ pressed ? 'Bold ●' : 'Bold' }}</template>
  </Toggle>
`;

export const Default: Story = {
  render: args => ({ components: { Toggle }, setup: () => ({ args }), template }),
};

export const Pressed: Story = {
  args: { defaultPressed: true },
  render: args => ({ components: { Toggle }, setup: () => ({ args }), template }),
};

export const Disabled: Story = {
  args: { disabled: true },
  render: args => ({ components: { Toggle }, setup: () => ({ args }), template }),
};
