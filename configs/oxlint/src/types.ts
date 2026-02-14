/**
 * Re-exported configuration types from `oxlint`.
 *
 * Keeps the preset API in sync with the oxlint CLI without
 * maintaining a separate copy of the types.
 *
 * @see https://oxc.rs/docs/guide/usage/linter/config-file-reference.html
 */
export type {
  OxlintConfig,
  OxlintOverride,
  OxlintEnv,
  OxlintGlobals,
  AllowWarnDeny,
  DummyRule,
  DummyRuleMap,
  RuleCategories,
} from 'oxlint';
