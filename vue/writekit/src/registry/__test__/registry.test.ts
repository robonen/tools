import { describe, expect, it } from 'vitest';
import { heading, paragraph } from '../../blocks';
import { bold } from '../../marks';
import { createRegistry } from '../registry';

describe('registry', () => {
  it('projects a schema from definitions', () => {
    const registry = createRegistry({ blocks: [paragraph, heading], marks: [bold] });
    expect(registry.schema.nodeSpec('paragraph')).toBeDefined();
    expect(registry.schema.markSpec('bold')).toBeDefined();
    expect(registry.getBlock('heading')?.meta?.title).toBe('Heading');
    expect(registry.listBlocks().map(block => block.type)).toEqual(['paragraph', 'heading']);
  });

  it('throws on a duplicate type by default', () => {
    expect(() => createRegistry({ blocks: [paragraph, paragraph] })).toThrow();
  });
});
