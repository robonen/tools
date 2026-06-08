import { isArray } from '@robonen/stdlib';
import type { StandardSchemaIssue, StandardSchemaV1 } from '@/types';
import type { FieldValidationResult, FormErrors } from './types';

/**
 * Convert a Standard Schema issue path into our dot-separated string form.
 */
export function issuePathToString(path: StandardSchemaIssue['path']): string {
  if (!path || path.length === 0)
    return '';

  let result = '';

  for (const segment of path) {
    const key = typeof segment === 'object' ? segment.key : segment;
    result = result === '' ? String(key) : `${result}.${String(key)}`;
  }

  return result;
}

/**
 * Fold a list of Standard Schema issues into a flat `path → messages` map.
 */
export function issuesToErrors(issues: readonly StandardSchemaIssue[]): FormErrors {
  const errors: FormErrors = {};

  for (const issue of issues) {
    const path = issuePathToString(issue.path);
    (errors[path] ??= []).push(issue.message);
  }

  return errors;
}

/**
 * The normalized outcome of validating a value against a Standard Schema.
 */
export interface StandardSchemaRun<Output> {
  valid: boolean;
  output?: Output;
  errors: FormErrors;
}

/**
 * Validate a value against a Standard Schema, awaiting async schemas, and map
 * the result into our `{ valid, output?, errors }` shape.
 */
export async function runStandardSchema<Output>(
  schema: StandardSchemaV1<any, Output>,
  value: unknown,
): Promise<StandardSchemaRun<Output>> {
  const result = await schema['~standard'].validate(value);

  if (result.issues)
    return { valid: false, errors: issuesToErrors(result.issues) };

  return { valid: true, output: result.value, errors: {} };
}

/**
 * Normalize the return of a field-level function validator into messages.
 * `true`/`null`/`undefined`/`''` mean valid (empty array).
 */
export function normalizeFieldResult(result: FieldValidationResult): string[] {
  if (result === true || result === null || result === undefined)
    return [];

  if (isArray(result))
    return result.filter(message => message.length > 0);

  return result.length > 0 ? [result] : [];
}
