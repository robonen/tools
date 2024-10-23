/**
 * @name flagsGenerator
 * @category Bits
 * @description Create a function that generates unique flags
 * 
 * @returns {Function} A function that generates unique flags
 * @throws {RangeError} If more than 31 flags are created
 *
 * @since 0.0.2
 */
export function flagsGenerator() {
    let lastFlag = 0;

    return () => {
      // 31 flags is the maximum number of flags that can be created
      // (without zero) because of the 32-bit integer limit in bitwise operations
      if (lastFlag & 0x40000000)
        throw new RangeError('Cannot create more than 31 flags');

      return (lastFlag = lastFlag === 0 ? 1 : lastFlag << 1);
    };
}

/**
 * @name and
 * @category Bits
 * @description Function to combine multiple flags using the AND operator
 * 
 * @param {number[]} flags - The flags to combine
 * @returns {number} The combined flags
 *
 * @since 0.0.2
 */
export function and(...flags: number[]) {
    return flags.reduce((acc, flag) => acc & flag, -1);
}

/**
 * @name or
 * @category Bits
 * @description Function to combine multiple flags using the OR operator
 * 
 * @param {number[]} flags - The flags to combine
 * @returns {number} The combined flags
 *
 * @since 0.0.2
 */
export function or(...flags: number[]) {
    return flags.reduce((acc, flag) => acc | flag, 0);
}

/**
 * @name not
 * @category Bits
 * @description Function to combine multiple flags using the XOR operator
 * 
 * @param {number} flag - The flag to apply the NOT operator to
 * @returns {number} The result of the NOT operator
 *
 * @since 0.0.2
 */
export function not(flag: number) {
    return ~flag;
}

/**
 * @name has
 * @category Bits
 * @description Function to make sure a flag has a specific bit set
 * 
 * @param {number} flag - The flag to check
 * @param {number} other - Flag to check
 * @returns {boolean} Whether the flag has the bit set
 *
 * @since 0.0.2
 */
export function has(flag: number, other: number) {
    return (flag & other) === other;
}

/**
 * @name is
 * @category Bits
 * @description Function to check if a flag is set
 * 
 * @param {number} flag - The flag to check
 * @returns {boolean} Whether the flag is set
 *
 * @since 0.0.2
 */
export function is(flag: number) {
    return flag !== 0;
}

/**
 * @name unset
 * @category Bits
 * @description Function to unset a flag
 * 
 * @param {number} flag - Source flag
 * @param {number} other - Flag to unset
 * @returns {number} The new flag
 *
 * @since 0.0.2
 */
export function unset(flag: number, other: number) {
    return flag & ~other;
}

/**
 * @name toggle
 * @category Bits
 * @description Function to toggle (xor) a flag
 * 
 * @param {number} flag - Source flag
 * @param {number} other - Flag to toggle
 * @returns {number} The new flag
 *
 * @since 0.0.2
 */
export function toggle(flag: number, other: number) {
    return flag ^ other;
}
