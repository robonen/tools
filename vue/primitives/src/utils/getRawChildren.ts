import type { VNode } from 'vue';
import { Comment, Fragment } from 'vue';
import { PatchFlags } from '@vue/shared';

/**
 * Recursively extracts and flattens VNodes from potentially nested Fragments
 * while filtering out Comment nodes.
 *
 * @param children - Array of VNodes to process
 * @returns Flattened array of non-Comment VNodes
 */
export function getRawChildren(children: VNode[]): VNode[] {
  const result: VNode[] = [];
  flatten(children, result);
  return result;
}

function flatten(children: VNode[], result: VNode[]): void {
  let keyedFragmentCount = 0;
  const startIdx = result.length;

  for (const child of children) {
    if (child.type === Fragment) {
      if (child.patchFlag & PatchFlags.KEYED_FRAGMENT) {
        keyedFragmentCount++;
      }

      flatten(child.children as VNode[], result);
    }
    else if (child.type !== Comment) {
      result.push(child);
    }
  }

  if (keyedFragmentCount > 1) {
    for (let i = startIdx; i < result.length; i++) {
      result[i]!.patchFlag = PatchFlags.BAIL;
    }
  }
}
