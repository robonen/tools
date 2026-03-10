import type { OxlintConfig } from '../types';

/**
 * Stylistic formatting rules via `@stylistic/eslint-plugin`.
 *
 * Uses the plugin's `customize()` defaults:
 * - indent: 2
 * - quotes: single
 * - semi: true
 * - braceStyle: stroustrup
 * - commaDangle: always-multiline
 * - arrowParens: false (as-needed)
 * - blockSpacing: true
 * - quoteProps: consistent-as-needed
 * - jsx: true
 *
 * Requires `@stylistic/eslint-plugin` to be installed.
 *
 * @see https://eslint.style/guide/config-presets
 */
export const stylistic: OxlintConfig = {
  jsPlugins: ['@stylistic/eslint-plugin'],

  rules: {
    /* ── spacing & layout ─────────────────────────────────── */
    '@stylistic/array-bracket-spacing': ['error', 'never'],
    '@stylistic/arrow-spacing': ['error', { after: true, before: true }],
    '@stylistic/block-spacing': ['error', 'always'],
    '@stylistic/comma-spacing': ['error', { after: true, before: false }],
    '@stylistic/computed-property-spacing': ['error', 'never', { enforceForClassMembers: true }],
    '@stylistic/dot-location': ['error', 'property'],
    '@stylistic/key-spacing': ['error', { afterColon: true, beforeColon: false }],
    '@stylistic/keyword-spacing': ['error', { after: true, before: true }],
    '@stylistic/no-mixed-spaces-and-tabs': 'error',
    '@stylistic/no-multi-spaces': 'error',
    '@stylistic/no-trailing-spaces': 'error',
    '@stylistic/no-whitespace-before-property': 'error',
    '@stylistic/rest-spread-spacing': ['error', 'never'],
    '@stylistic/semi-spacing': ['error', { after: true, before: false }],
    '@stylistic/space-before-blocks': ['error', 'always'],
    '@stylistic/space-before-function-paren': ['error', { anonymous: 'always', asyncArrow: 'always', named: 'never' }],
    '@stylistic/space-in-parens': ['error', 'never'],
    '@stylistic/space-infix-ops': 'error',
    '@stylistic/space-unary-ops': ['error', { nonwords: false, words: true }],
    '@stylistic/template-curly-spacing': 'error',
    '@stylistic/template-tag-spacing': ['error', 'never'],

    /* ── braces & blocks ──────────────────────────────────── */
    '@stylistic/brace-style': ['error', 'stroustrup', { allowSingleLine: true }],
    '@stylistic/arrow-parens': ['error', 'as-needed', { requireForBlockBody: true }],
    '@stylistic/no-extra-parens': ['error', 'functions'],
    '@stylistic/no-floating-decimal': 'error',
    '@stylistic/wrap-iife': ['error', 'any', { functionPrototypeMethods: true }],
    '@stylistic/new-parens': 'error',
    '@stylistic/padded-blocks': ['error', { blocks: 'never', classes: 'never', switches: 'never' }],

    /* ── punctuation ──────────────────────────────────────── */
    '@stylistic/comma-dangle': ['error', 'always-multiline'],
    '@stylistic/comma-style': ['error', 'last'],
    '@stylistic/semi': ['error', 'always'],
    '@stylistic/quotes': ['error', 'single', { allowTemplateLiterals: 'always', avoidEscape: false }],
    '@stylistic/quote-props': ['error', 'as-needed'],

    /* ── indentation ──────────────────────────────────────── */
    '@stylistic/indent': ['error', 2, {
      ArrayExpression: 1,
      CallExpression: { arguments: 1 },
      flatTernaryExpressions: false,
      FunctionDeclaration: { body: 1, parameters: 1, returnType: 1 },
      FunctionExpression: { body: 1, parameters: 1, returnType: 1 },
      ignoreComments: false,
      ignoredNodes: [
        'TSUnionType',
        'TSIntersectionType',
      ],
      ImportDeclaration: 1,
      MemberExpression: 1,
      ObjectExpression: 1,
      offsetTernaryExpressions: true,
      outerIIFEBody: 1,
      SwitchCase: 1,
      tabLength: 2,
      VariableDeclarator: 1,
    }],
    '@stylistic/indent-binary-ops': ['error', 2],
    '@stylistic/no-tabs': 'error',

    /* ── line breaks ──────────────────────────────────────── */
    '@stylistic/eol-last': 'error',
    '@stylistic/no-multiple-empty-lines': ['error', { max: 1, maxBOF: 0, maxEOF: 0 }],
    '@stylistic/lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
    '@stylistic/max-statements-per-line': ['error', { max: 1 }],
    '@stylistic/multiline-ternary': ['error', 'always-multiline'],
    '@stylistic/operator-linebreak': ['error', 'before'],
    '@stylistic/object-curly-spacing': ['error', 'always'],

    /* ── generators ───────────────────────────────────────── */
    '@stylistic/generator-star-spacing': ['error', { after: true, before: false }],
    '@stylistic/yield-star-spacing': ['error', { after: true, before: false }],

    /* ── operators & mixed ────────────────────────────────── */
    '@stylistic/no-mixed-operators': ['error', {
      allowSamePrecedence: true,
      groups: [
        ['==', '!=', '===', '!==', '>', '>=', '<', '<='],
        ['&&', '||'],
        ['in', 'instanceof'],
      ],
    }],

    /* ── typescript styling ───────────────────────────────── */
    '@stylistic/member-delimiter-style': ['error', {
      multiline: { delimiter: 'semi', requireLast: true },
      multilineDetection: 'brackets',
      overrides: {
        interface: {
          multiline: { delimiter: 'semi', requireLast: true },
        },
      },
      singleline: { delimiter: 'semi' },
    }],
    '@stylistic/type-annotation-spacing': ['error', {}],
    '@stylistic/type-generic-spacing': 'error',
    '@stylistic/type-named-tuple-spacing': 'error',

    /* ── comments ─────────────────────────────────────────── */
    '@stylistic/spaced-comment': ['error', 'always', {
      block: { balanced: true, exceptions: ['*'], markers: ['!'] },
      line: { exceptions: ['/', '#'], markers: ['/'] },
    }],

    /* ── jsx ───────────────────────────────────────────────── */
    '@stylistic/jsx-closing-bracket-location': 'error',
    '@stylistic/jsx-closing-tag-location': 'error',
    '@stylistic/jsx-curly-brace-presence': ['error', { propElementValues: 'always' }],
    '@stylistic/jsx-curly-newline': 'error',
    '@stylistic/jsx-curly-spacing': ['error', 'never'],
    '@stylistic/jsx-equals-spacing': 'error',
    '@stylistic/jsx-first-prop-new-line': 'error',
    '@stylistic/jsx-function-call-newline': ['error', 'multiline'],
    '@stylistic/jsx-indent-props': ['error', 2],
    '@stylistic/jsx-max-props-per-line': ['error', { maximum: 1, when: 'multiline' }],
    '@stylistic/jsx-one-expression-per-line': ['error', { allow: 'single-child' }],
    '@stylistic/jsx-quotes': 'error',
    '@stylistic/jsx-tag-spacing': ['error', {
      afterOpening: 'never',
      beforeClosing: 'never',
      beforeSelfClosing: 'always',
      closingSlash: 'never',
    }],
    '@stylistic/jsx-wrap-multilines': ['error', {
      arrow: 'parens-new-line',
      assignment: 'parens-new-line',
      condition: 'parens-new-line',
      declaration: 'parens-new-line',
      logical: 'parens-new-line',
      prop: 'parens-new-line',
      propertyValue: 'parens-new-line',
      return: 'parens-new-line',
    }],
  },
};
