import type { Meta, StoryObj } from '@storybook/vue3-vite';
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from '@robonen/primitives';

const meta = {
  title: 'Overlays/Dialog',
  component: DialogRoot,
  tags: ['autodocs'],
  argTypes: {
    modal: { control: 'boolean' },
    defaultOpen: { control: 'boolean' },
  },
  args: {
    modal: true,
    defaultOpen: false,
  },
} satisfies Meta<typeof DialogRoot>;

export default meta;
type Story = StoryObj<typeof meta>;

const render = (args: Record<string, unknown>) => ({
  components: {
    DialogRoot,
    DialogTrigger,
    DialogPortal,
    DialogOverlay,
    DialogContent,
    DialogTitle,
    DialogDescription,
    DialogClose,
  },
  setup: () => ({ args }),
  template: `
    <DialogRoot v-bind="args">
      <DialogTrigger class="sb-dialog-trigger">Open Dialog</DialogTrigger>
      <DialogPortal>
        <DialogOverlay class="sb-dialog-overlay" />
        <DialogContent class="sb-dialog-content">
          <DialogTitle class="sb-dialog-title">Dialog Title</DialogTitle>
          <DialogDescription class="sb-dialog-desc">
            Traps focus, locks scroll, and dismisses on Escape or outside click.
          </DialogDescription>
          <DialogClose class="sb-dialog-close">Close</DialogClose>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  `,
});

export const Default: Story = { render };

export const OpenByDefault: Story = {
  args: { defaultOpen: true },
  render,
};

export const NonModal: Story = {
  args: { modal: false },
  render: args => ({
    components: {
      DialogRoot,
      DialogTrigger,
      DialogPortal,
      DialogContent,
      DialogTitle,
      DialogDescription,
      DialogClose,
    },
    setup: () => ({ args }),
    template: `
      <DialogRoot v-bind="args">
        <DialogTrigger class="sb-dialog-trigger">Open non-modal</DialogTrigger>
        <DialogPortal>
          <DialogContent class="sb-dialog-content">
            <DialogTitle class="sb-dialog-title">Non-modal dialog</DialogTitle>
            <DialogDescription class="sb-dialog-desc">
              No overlay, no scroll lock, no focus trap.
            </DialogDescription>
            <DialogClose class="sb-dialog-close">Close</DialogClose>
          </DialogContent>
        </DialogPortal>
      </DialogRoot>
    `,
  }),
};
