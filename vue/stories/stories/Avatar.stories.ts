import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { AvatarFallback, AvatarImage, AvatarRoot } from '@robonen/primitives';

const meta = {
  title: 'Media/Avatar',
  component: AvatarRoot,
  tags: ['autodocs'],
} satisfies Meta<typeof AvatarRoot>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loaded: Story = {
  render: () => ({
    components: { AvatarRoot, AvatarImage, AvatarFallback },
    template: `
      <AvatarRoot class="sb-avatar">
        <AvatarImage src="https://i.pravatar.cc/96?img=5" alt="User" class="sb-avatar-img" />
        <AvatarFallback class="sb-avatar-fallback" :delayMs="300">CT</AvatarFallback>
      </AvatarRoot>
    `,
  }),
};

export const Fallback: Story = {
  render: () => ({
    components: { AvatarRoot, AvatarImage, AvatarFallback },
    template: `
      <AvatarRoot class="sb-avatar">
        <AvatarImage src="https://invalid.example.com/missing.png" alt="User" class="sb-avatar-img" />
        <AvatarFallback class="sb-avatar-fallback">AB</AvatarFallback>
      </AvatarRoot>
    `,
  }),
};
