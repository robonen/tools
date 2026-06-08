/**
 * The content model of a block — a deliberately small, closed union instead of
 * ProseMirror's content-expression grammar (KISS).
 *
 * - `text`: holds inline content; `marks` whitelists which marks may apply,
 * - `container`: holds child blocks (reserved; no default block uses it yet),
 * - `atom`: holds no editable content (image, divider).
 */
export type ContentKind
  = | { readonly kind: 'text'; readonly marks?: 'all' | 'none' | readonly string[] }
    | { readonly kind: 'container'; readonly allow?: readonly string[]; readonly group?: string }
    | { readonly kind: 'atom' };
