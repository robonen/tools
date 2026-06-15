/**
 * Any function
 */
// `(...args: any[]) => any` is the idiomatic "any function" constraint; `unknown`
// would reject legitimate function shapes when used as `T extends AnyFunction`.
export type AnyFunction = (...args: any[]) => any;

/**
 * Void function
 */
export type VoidFunction = () => void;
