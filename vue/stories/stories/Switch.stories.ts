import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { Label, Switch } from '@robonen/primitives';
import { ref } from 'vue';

const meta = {
  title: 'Forms/Switch',
  component: Switch,
  tags: ['autodocs'],
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BooleanDefault: Story = {
  name: 'Boolean (default)',
  render: () => ({
    components: { Switch, Label },
    template: `
      <div style="display:flex;align-items:center;gap:0.5rem;font-family:system-ui">
        <Switch id="airplane" class="sb-switch">
          <span class="sb-switch-thumb" />
        </Switch>
        <Label for="airplane">Airplane mode</Label>
      </div>
    `,
  }),
};

export const StringPair: Story = {
  name: 'String pair ("on" / "off")',
  render: () => ({
    components: { Switch, Label },
    setup() {
      const value = ref<'on' | 'off'>('off');
      return { value };
    },
    template: `
      <div style="display:flex;align-items:center;gap:0.5rem;font-family:system-ui">
        <Switch
          v-model="value"
          truthy="on"
          falsy="off"
          id="mode"
          class="sb-switch"
        >
          <span class="sb-switch-thumb" />
        </Switch>
        <Label for="mode">Mode: {{ value }}</Label>
      </div>
    `,
  }),
};

export const ObjectPair: Story = {
  name: 'Object pair (generic)',
  render: () => ({
    components: { Switch, Label },
    setup() {
      const LIGHT = { theme: 'light' as const };
      const DARK = { theme: 'dark' as const };
      const value = ref<typeof LIGHT | typeof DARK>(LIGHT);
      return { value, LIGHT, DARK };
    },
    template: `
      <div style="display:flex;align-items:center;gap:0.5rem;font-family:system-ui">
        <Switch
          v-model="value"
          :truthy="DARK"
          :falsy="LIGHT"
          id="theme"
          class="sb-switch"
        >
          <span class="sb-switch-thumb" />
        </Switch>
        <Label for="theme">Theme: {{ value.theme }}</Label>
      </div>
    `,
  }),
};

export const Disabled: Story = {
  name: 'Disabled',
  render: () => ({
    components: { Switch, Label },
    template: `
      <div style="display:flex;align-items:center;gap:0.5rem;font-family:system-ui">
        <Switch id="disabled-sw" class="sb-switch" disabled :default-value="true">
          <span class="sb-switch-thumb" />
        </Switch>
        <Label for="disabled-sw">Disabled (checked)</Label>
      </div>
    `,
  }),
};
