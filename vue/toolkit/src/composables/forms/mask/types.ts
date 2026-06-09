/**
 * A selection range as `[from, to]`. A collapsed caret has `from === to`.
 */
export type SelectionRange = readonly [from: number, to: number];

/**
 * The DOM-free editable state the masking engine operates on: a value plus its
 * selection. Structurally compatible with `@robonen/platform`'s `InputState`.
 */
export interface ElementState {
  readonly value: string;
  readonly selection: SelectionRange;
}

/**
 * A concrete mask pattern: either a single {@link RegExp} validating the whole
 * value, or an array of slots where a `string` is a fixed (auto-inserted)
 * character and a {@link RegExp} validates exactly one character.
 */
export type MaskExpression = ReadonlyArray<RegExp | string> | RegExp;

/**
 * A mask: a concrete {@link MaskExpression} or a function deriving one from the
 * current {@link ElementState} (a dynamic mask).
 */
export type Mask = MaskExpression | ((state: ElementState) => MaskExpression);

/**
 * The user gesture a preprocessor is reacting to.
 */
export type MaskAction = 'deleteBackward' | 'deleteForward' | 'insert' | 'validation';

/**
 * How newly typed characters interact with the text under a collapsed caret:
 * - `shift` — insert, pushing existing characters right (default);
 * - `replace` — overwrite the following characters;
 * - a function resolving the mode per {@link ElementState}.
 */
export type OverwriteMode = 'replace' | 'shift' | ((state: ElementState) => 'replace' | 'shift');

/**
 * Input to a {@link MaskPreprocessor}.
 */
export interface MaskPreprocessorParams {
  readonly elementState: ElementState;
  readonly data: string;
}

/**
 * Output of a {@link MaskPreprocessor}.
 */
export interface MaskPreprocessorResult {
  readonly elementState: ElementState;
  readonly data?: string;
}

/**
 * Runs before the mask conforms a value — normalizes the upcoming state/data.
 */
export type MaskPreprocessor = (params: MaskPreprocessorParams, action: MaskAction) => MaskPreprocessorResult;

/**
 * Runs after the mask conforms a value — applies finishing touches (separators,
 * padding, clamping). Receives the conformed state and the pre-change state.
 */
export type MaskPostprocessor = (state: ElementState, initialState: ElementState) => ElementState;

/**
 * A full mask configuration.
 */
export interface MaskOptions {
  /**
   * The mask pattern (or a function of state).
   */
  readonly mask: Mask;
  /**
   * Normalizers run before conforming.
   */
  readonly preprocessors?: readonly MaskPreprocessor[];
  /**
   * Finishers run after conforming.
   */
  readonly postprocessors?: readonly MaskPostprocessor[];
  /**
   * Insert vs overwrite behavior.
   *
   * @default 'shift'
   */
  readonly overwriteMode?: OverwriteMode;
}

/**
 * The friendly authoring union accepted at every public boundary: a full
 * {@link MaskOptions}, a bare {@link Mask}, or a template `string`
 * (compiled via `maskFromTemplate`, e.g. `'+1 (###) ###-####'`).
 */
export type MaskOptionInput = Mask | string | MaskOptions;

/**
 * {@link MaskOptions} after defaults are applied (internal).
 */
export interface ResolvedMaskOptions {
  readonly mask: Mask;
  readonly preprocessors: readonly MaskPreprocessor[];
  readonly postprocessors: readonly MaskPostprocessor[];
  readonly overwriteMode: OverwriteMode;
}
