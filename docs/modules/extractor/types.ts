/**
 * Metadata types for the documentation extractor.
 * These types represent the structured data extracted from source packages
 * via ts-morph, used to generate documentation pages.
 */

export interface DocsMetadata {
  packages: PackageMeta[];
  generatedAt: string;
}

export interface PackageMeta {
  /** Package name from package.json, e.g. "@robonen/stdlib" */
  name: string;
  /** Package version */
  version: string;
  /** Package description from package.json */
  description: string;
  /** URL-friendly slug derived from package name, e.g. "stdlib" */
  slug: string;
  /** Subpath export entries (e.g. "." or "./browsers") */
  entryPoints: string[];
  /** All documented items grouped by category */
  categories: CategoryMeta[];
}

export interface CategoryMeta {
  /** Category name from @category JSDoc tag or directory name */
  name: string;
  /** URL-friendly slug */
  slug: string;
  /** Items in this category */
  items: ItemMeta[];
}

export interface ItemMeta {
  /** Export name */
  name: string;
  /** URL-friendly slug (camelCase → kebab-case) */
  slug: string;
  /** Kind of export */
  kind: 'function' | 'class' | 'type' | 'interface' | 'enum' | 'variable';
  /** Description from @description tag or first JSDoc line */
  description: string;
  /** Version when this item was introduced */
  since: string;
  /** Full TypeScript signature(s) — supports overloads */
  signatures: string[];
  /** Function/method parameters */
  params: ParamMeta[];
  /** Return type description */
  returns: ReturnMeta | null;
  /** Template/generic type parameters */
  typeParams: TypeParamMeta[];
  /** Code examples from @example tags */
  examples: string[];
  /** Class methods (only for kind === 'class') */
  methods: MethodMeta[];
  /** Class/interface properties (only for kind === 'class' or 'interface') */
  properties: PropertyMeta[];
  /** Whether a demo.vue file exists alongside */
  hasDemo: boolean;
  /** Raw source code of the demo.vue file (for syntax-highlighted display) */
  demoSource: string;
  /** Whether an index.test.ts file exists alongside */
  hasTests: boolean;
  /** Related types/interfaces co-located in the same module directory */
  relatedTypes: ItemMeta[];
  /** Relative path to the source file from repo root */
  sourcePath: string;
  /** Subpath export this belongs to (e.g. "." or "./browsers") */
  entryPoint: string;
}

export interface ParamMeta {
  name: string;
  type: string;
  description: string;
  optional: boolean;
  defaultValue: string | null;
}

export interface ReturnMeta {
  type: string;
  description: string;
}

export interface TypeParamMeta {
  name: string;
  constraint: string | null;
  default: string | null;
  description: string;
}

export interface MethodMeta {
  name: string;
  description: string;
  signatures: string[];
  params: ParamMeta[];
  returns: ReturnMeta | null;
  /** Visibility: public, protected, private */
  visibility: string;
}

export interface PropertyMeta {
  name: string;
  type: string;
  description: string;
  optional: boolean;
  defaultValue: string | null;
  readonly: boolean;
}
