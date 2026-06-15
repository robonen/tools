<script lang="ts">
import type { CSSProperties } from 'vue';
import { Teleport, computed, defineComponent, h, mergeProps } from 'vue';
import { useFlowContext, useFlowNodeContext } from './context';
import type { Position } from './types';

/**
 * A contextual toolbar anchored to its node, teleported out of the transformed
 * layer so it renders at a constant 1:1 scale regardless of zoom. Position is
 * recomputed from the node's absolute rect via `flowToScreen` (fixed
 * positioning). Visible when the node is selected by default; override with
 * `isVisible`. Placed inside a custom node component.
 *
 * Implemented as a render function: a `<Teleport>` toggled by `v-if` at an SFC
 * template root does not reliably re-subscribe to its visibility source, so the
 * conditional teleport is expressed directly here.
 */
export interface FlowNodeToolbarProps {
  /** Force visibility; defaults to "visible while the node is selected". */
  isVisible?: boolean;
  /** Side of the node to anchor to. @default 'top' */
  position?: Position;
  /** Gap from the node edge in px. @default 8 */
  offset?: number;
  /** Teleport target. @default 'body' */
  to?: string;
}

const TRANSFORMS = (offset: number): Record<Position, string> => ({
  top: `translate(-50%, calc(-100% - ${offset}px))`,
  bottom: `translate(-50%, ${offset}px)`,
  left: `translate(calc(-100% - ${offset}px), -50%)`,
  right: `translate(${offset}px, -50%)`,
});

export default defineComponent({
  name: 'FlowNodeToolbar',
  inheritAttrs: false,
  props: {
    isVisible: { type: Boolean, default: undefined },
    position: { type: String as () => Position, default: 'top' },
    offset: { type: Number, default: 8 },
    to: { type: String, default: 'body' },
  },
  setup(props, { slots, attrs }) {
    const ctx = useFlowContext();
    const nodeCtx = useFlowNodeContext();

    const visible = computed(() => (props.isVisible === undefined ? nodeCtx.selected.value : props.isVisible));

    const style = computed<CSSProperties>(() => {
      const node = nodeCtx.node.value;
      if (!node) return { display: 'none' };
      const { x, y } = node.positionAbsolute;
      const { width, height } = node.measured;
      let fx = x + width / 2;
      let fy = y + height / 2;
      if (props.position === 'top') fy = y;
      else if (props.position === 'bottom') fy = y + height;
      else if (props.position === 'left') fx = x;
      else if (props.position === 'right') fx = x + width;
      const a = ctx.flowToScreen({ x: fx, y: fy });
      return {
        position: 'fixed',
        left: `${a.x}px`,
        top: `${a.y}px`,
        transform: TRANSFORMS(props.offset)[props.position],
        pointerEvents: 'all',
        zIndex: '1000',
      };
    });

    return () =>
      visible.value
        ? h(Teleport, { to: props.to }, [
            h(
              'div',
              mergeProps(attrs, {
                'data-flow-node-toolbar': '',
                'data-position': props.position,
                style: style.value,
                onPointerdown: (e: Event) => e.stopPropagation(),
                onWheel: (e: Event) => e.stopPropagation(),
              }),
              slots.default?.(),
            ),
          ])
        : null;
  },
});
</script>
