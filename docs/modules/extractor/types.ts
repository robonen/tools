/**
 * Metadata types for the documentation extractor.
 *
 * The docs site is "flexible": every package declares a {@link PackageKind}
 * and is rendered with a layout that fits its nature —
 *  - `api`        → reference of functions / classes / types (from JSDoc)
 *  - `components` → component gallery with per-part anatomy (props/emits/slots)
 *  - `guide`      → prose guide rendered from co-located Markdown
 */

export interface DocsMetadata {
  packages: PackageMeta[];
  generatedAt: string;
}

/** How a package's documentation should be presented. */
export type PackageKind = 'api' | 'components' | 'guide';

/** Top-level grouping used for sidebar / landing organisation. */
export type PackageGroup = 'core' | 'vue' | 'configs' | 'infra';

export interface PackageMeta {
  /** Package name from package.json, e.g. "@robonen/stdlib" */
  name: string;
  /** Package version */
  version: string;
  /** Package description from package.json */
  description: string;
  /** URL-friendly slug derived from package name, e.g. "stdlib" */
  slug: string;
  /** Presentation kind — drives which layout the page uses */
  kind: PackageKind;
  /** Sidebar / landing group */
  group: PackageGroup;
  /** Subpath export entries (e.g. "." or "./browsers") */
  entryPoints: string[];

  // ── kind: 'api' ──────────────────────────────────────────────────────────
  /** Documented API items grouped by category (kind === 'api') */
  categories: CategoryMeta[];

  // ── kind: 'components' ─────────────────────────────────────────────────────
  /** Documented component groups (kind === 'components') */
  components: ComponentMeta[];

  // ── kind: 'guide' ──────────────────────────────────────────────────────────
  /** Prose sections rendered from Markdown (kind === 'guide') */
  sections: GuideSection[];

  // ── any kind ───────────────────────────────────────────────────────────────
  /**
   * Hand-authored `.vue` documentation pages discovered from `<pkg>/docs/*.vue`.
   * Independent of `kind` — an `api` package can still ship a rich intro and
   * several prose sections alongside its auto-generated reference.
   */
  docs: DocSection[];
}

// ── API kind ─────────────────────────────────────────────────────────────────

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
  /** Statement-coverage percentage for the source file, if coverage data exists */
  coverage?: number | null;
  /** Related types/interfaces co-located in the same module directory */
  relatedTypes: ItemMeta[];
  /** Relative path to the source file from repo root */
  sourcePath: string;
  /** Subpath export this belongs to (e.g. "." or "./browsers") */
  entryPoint: string;
}

// ── Components kind ────────────────────────────────────────────────────────────

export interface ComponentMeta {
  /** Display name of the component group, e.g. "Accordion" */
  name: string;
  /** URL-friendly slug, e.g. "accordion" */
  slug: string;
  /** Short description (from README heading or first JSDoc) */
  description: string;
  /** Subpath export, e.g. "./accordion" */
  entryPoint: string;
  /** Ordered parts that compose the anatomy (Root, Item, Trigger, …) */
  parts: ComponentPartMeta[];
  /** Whether a demo.vue exists for the group */
  hasDemo: boolean;
  /** Raw demo source */
  demoSource: string;
  /** Relative path to the component directory from repo root */
  sourcePath: string;
}

export interface ComponentPartMeta {
  /** Component name, e.g. "AccordionRoot" */
  name: string;
  /** Short role label derived from the suffix (Root, Item, Trigger…) */
  role: string;
  /** Description from the Props interface JSDoc */
  description: string;
  /** Props parsed from the `XxxProps` interface */
  props: PropertyMeta[];
  /** Emitted events parsed from `defineEmits` */
  emits: EmitMeta[];
}

export interface EmitMeta {
  /** Event name, e.g. "update:modelValue" */
  name: string;
  /** Payload signature, e.g. "[value: string]" */
  payload: string;
  /** Description, if documented */
  description: string;
}

// ── Guide kind ─────────────────────────────────────────────────────────────────

export interface GuideSection {
  /** Heading-derived title, e.g. "imports preset" */
  title: string;
  /** URL-friendly slug, e.g. "imports" */
  slug: string;
  /** Raw Markdown content (rendered client-side) */
  markdown: string;
}

// ── Hand-authored .vue doc sections (any kind) ──────────────────────────────────

export interface DocSection {
  /** Display title (from a `<!-- title: … -->` comment or the filename). */
  title: string;
  /** URL-friendly slug, e.g. "introduction" or "concepts". */
  slug: string;
  /** Sort order (from a `<!-- order: N -->` comment or a numeric filename prefix). */
  order: number;
  /** `true` for `docs/intro.vue` — rendered as the package landing page. */
  isIntro: boolean;
  /** Relative path to the `.vue` file from repo root (for the GitHub source link). */
  sourcePath: string;
}

// ── Shared leaf types ──────────────────────────────────────────────────────────

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
  /**
   * Properties of the returned object, when the return type is one of the
   * package's own interfaces — rendered as a table like parameters.
   */
  properties?: PropertyMeta[];
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
