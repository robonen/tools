/**
 * Default {@link maskFromTemplate} tokens: `#` → digit, `A` → letter,
 * `*` → letter or digit. Every other template character is a fixed literal.
 */
export const DEFAULT_MASK_TOKENS: Readonly<Record<string, RegExp>> = {
  '#': /\d/,
  A: /[a-z]/i,
  '*': /[a-z0-9]/i,
};

// Compiled-mask cache for the default-token path. Function masks (phone/card)
// re-resolve the same template several times per keystroke; caching collapses
// each repeat to a Map hit instead of rebuilding a 12-17 element array.
const TEMPLATE_CACHE = new Map<string, ReadonlyArray<RegExp | string>>();

function compileTemplate(template: string, tokens: Readonly<Record<string, RegExp>>): Array<RegExp | string> {
  const mask: Array<RegExp | string> = [];

  for (const char of template)
    mask.push(tokens[char] ?? char);

  return mask;
}

/**
 * @name maskFromTemplate
 * @category Forms
 * @description Compile a human-readable template into a mask array. Token
 * characters become matcher slots; everything else becomes a fixed literal. With
 * the default tokens the compiled array is cached and shared (frozen) per
 * template string; pass a custom `tokens` map to opt out.
 *
 * @param {string} template e.g. `'+1 (###) ###-####'`
 * @param {Record<string, RegExp>} [tokens=DEFAULT_MASK_TOKENS] Token → matcher map
 * @returns {ReadonlyArray<RegExp | string>} The compiled mask expression
 *
 * @example
 * maskFromTemplate('##/##/####'); // [/\d/, /\d/, '/', /\d/, /\d/, '/', /\d/, /\d/, /\d/, /\d/]
 *
 * @since 0.0.17
 */
export function maskFromTemplate(
  template: string,
  tokens: Readonly<Record<string, RegExp>> = DEFAULT_MASK_TOKENS,
): ReadonlyArray<RegExp | string> {
  if (tokens !== DEFAULT_MASK_TOKENS)
    return compileTemplate(template, tokens);

  const cached = TEMPLATE_CACHE.get(template);
  if (cached)
    return cached;

  const compiled = Object.freeze(compileTemplate(template, tokens));
  TEMPLATE_CACHE.set(template, compiled);

  return compiled;
}
