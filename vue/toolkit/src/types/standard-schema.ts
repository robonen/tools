/**
 * Vendored, dependency-free types for the
 * [Standard Schema](https://github.com/standard-schema/standard-schema) spec (v1).
 *
 * Any validation library implementing the `~standard` contract — zod, valibot,
 * arktype, … — is structurally assignable to {@link StandardSchemaV1}, so the
 * forms layer can accept them without taking on a dependency. The namespace
 * pattern from the official spec is flattened into named exports to stay within
 * the repo's lint rules.
 */

/**
 * The Standard Schema interface. A schema is any object exposing a `~standard`
 * property describing how to validate a value.
 */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  /**
   * The Standard Schema properties.
   */
  readonly '~standard': StandardSchemaProps<Input, Output>;
}

/**
 * The properties carried on a schema's `~standard` key.
 */
export interface StandardSchemaProps<Input = unknown, Output = Input> {
  /**
   * The version number of the standard.
   */
  readonly version: 1;
  /**
   * The vendor name of the schema library (e.g. `'zod'`, `'valibot'`).
   */
  readonly vendor: string;
  /**
   * Validate an unknown value, returning its typed output or a list of issues.
   */
  readonly validate: (
    value: unknown,
  ) => StandardSchemaResult<Output> | Promise<StandardSchemaResult<Output>>;
  /**
   * Inferred input/output types — present only at type level.
   */
  readonly types?: StandardSchemaTypes<Input, Output> | undefined;
}

/**
 * The result of validating a value: either a success carrying the typed output
 * or a failure carrying a list of issues.
 */
export type StandardSchemaResult<Output>
  = | StandardSchemaSuccessResult<Output>
    | StandardSchemaFailureResult;

/**
 * A successful validation result.
 */
export interface StandardSchemaSuccessResult<Output> {
  /**
   * The validated, typed value.
   */
  readonly value: Output;
  /**
   * The absence of issues marks success.
   */
  readonly issues?: undefined;
}

/**
 * A failed validation result.
 */
export interface StandardSchemaFailureResult {
  /**
   * The non-empty list of validation issues.
   */
  readonly issues: readonly StandardSchemaIssue[];
}

/**
 * A single validation issue.
 */
export interface StandardSchemaIssue {
  /**
   * A human-readable message describing the issue.
   */
  readonly message: string;
  /**
   * The path to the offending value, as keys or `{ key }` segments.
   */
  readonly path?: ReadonlyArray<PropertyKey | StandardSchemaPathSegment> | undefined;
}

/**
 * A single segment of an issue path.
 */
export interface StandardSchemaPathSegment {
  /**
   * The key of this path segment.
   */
  readonly key: PropertyKey;
}

/**
 * The inferred input/output types of a schema.
 */
export interface StandardSchemaTypes<Input = unknown, Output = Input> {
  /**
   * The input type accepted by the schema.
   */
  readonly input: Input;
  /**
   * The output type produced by the schema.
   */
  readonly output: Output;
}

/**
 * Infer the input type of a Standard Schema.
 */
export type StandardSchemaInferInput<Schema extends StandardSchemaV1>
  = NonNullable<Schema['~standard']['types']>['input'];

/**
 * Infer the output type of a Standard Schema.
 */
export type StandardSchemaInferOutput<Schema extends StandardSchemaV1>
  = NonNullable<Schema['~standard']['types']>['output'];
