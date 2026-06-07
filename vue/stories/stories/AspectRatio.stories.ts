import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { AspectRatio } from '@robonen/primitives';

const meta = {
  title: 'Layout/AspectRatio',
  component: AspectRatio,
  tags: ['autodocs'],
  argTypes: {
    ratio: { control: { type: 'number', min: 0.1, step: 0.1 } },
  },
  args: { ratio: 16 / 9 },
} satisfies Meta<typeof AspectRatio>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Widescreen: Story = {
  render: args => ({
    components: { AspectRatio },
    setup: () => ({ args }),
    template: `
      <div style="width: 400px; border-radius: 8px; overflow: hidden">
        <AspectRatio v-bind="args">
          <img
            src="https://images.unsplash.com/photo-1535025183041-0991a977e25b?w=800"
            alt="landscape"
            style="width:100%;height:100%;object-fit:cover"
          />
        </AspectRatio>
      </div>
    `,
  }),
};

export const Square: Story = {
  args: { ratio: 1 },
  render: args => ({
    components: { AspectRatio },
    setup: () => ({ args }),
    template: `
      <div style="width: 200px; background: #eee; border-radius: 8px; overflow: hidden">
        <AspectRatio v-bind="args">
          <div style="display:flex;align-items:center;justify-content:center;height:100%;font-family:system-ui">1 : 1</div>
        </AspectRatio>
      </div>
    `,
  }),
};
