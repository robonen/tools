import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from '@robonen/primitives';

const meta = {
  title: 'Disclosure/Collapsible',
  component: CollapsibleRoot,
  tags: ['autodocs'],
  args: { defaultOpen: false, disabled: false },
} satisfies Meta<typeof CollapsibleRoot>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => ({
    components: { CollapsibleRoot, CollapsibleTrigger, CollapsibleContent },
    setup: () => ({ args }),
    template: `
      <CollapsibleRoot v-bind="args" class="sb-collapsible">
        <CollapsibleTrigger class="sb-collapsible-trigger">
          <template #default="{ open }">{{ open ? 'Hide' : 'Show' }} details</template>
        </CollapsibleTrigger>
        <CollapsibleContent class="sb-collapsible-content">
          <p style="margin:0.5rem 0 0">Hidden content revealed when the trigger is activated.</p>
        </CollapsibleContent>
      </CollapsibleRoot>
    `,
  }),
};

export const OpenByDefault: Story = { args: { defaultOpen: true }, render: Default.render };
export const Disabled: Story = { args: { disabled: true }, render: Default.render };
