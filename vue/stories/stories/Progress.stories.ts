import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ProgressIndicator, ProgressRoot } from '@robonen/primitives';

const meta = {
  title: 'Feedback/Progress',
  component: ProgressRoot,
  tags: ['autodocs'],
  argTypes: {
    modelValue: { control: { type: 'number', min: 0, max: 100, step: 1 } },
    max: { control: { type: 'number', min: 1 } },
  },
  args: { modelValue: 40, max: 100 },
} satisfies Meta<typeof ProgressRoot>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Determinate: Story = {
  render: args => ({
    components: { ProgressRoot, ProgressIndicator },
    setup: () => ({ args }),
    template: `
      <ProgressRoot v-bind="args" class="sb-progress">
        <template #default="{ value, max }">
          <ProgressIndicator
            class="sb-progress-ind"
            :style="{ width: value == null ? '100%' : (value / max * 100) + '%' }"
          />
        </template>
      </ProgressRoot>
    `,
  }),
};

export const Indeterminate: Story = {
  args: { modelValue: null },
  render: Determinate.render,
};

export const Complete: Story = {
  args: { modelValue: 100 },
  render: Determinate.render,
};
