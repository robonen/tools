import type { EditorDocument } from '../model';
import type { Schema } from './schema';

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

/**
 * Structural validation of a document against a schema. Reports unknown block
 * types, missing required attrs, and failed attr validators. Used in tests and
 * as a guard around untrusted input; runtime mutation paths rely on
 * {@link normalizeDocument} instead.
 */
export function validateDocument(doc: EditorDocument, schema: Schema): ValidationResult {
  const errors: string[] = [];

  for (const block of doc.content) {
    const spec = schema.nodeSpec(block.type);

    if (!spec) {
      errors.push(`unknown block type: '${block.type}'`);
      continue;
    }

    if (!spec.attrs)
      continue;

    for (const key in spec.attrs) {
      const attr = spec.attrs[key]!;
      const value = block.attrs[key];

      if (attr.required && value === undefined && attr.default === undefined)
        errors.push(`block '${block.type}' is missing required attr '${key}'`);

      if (attr.validate && value !== undefined && !attr.validate(value))
        errors.push(`block '${block.type}' has invalid attr '${key}'`);
    }
  }

  return { valid: errors.length === 0, errors };
}
