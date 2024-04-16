/**
 * Create a function that generates unique flags
 * 
 * @returns {Function} A function that generates unique flags
 * @throws {RangeError} If more than 31 flags are created
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
 * Function to combine multiple flags using the AND operator
 * 
 * @param {number[]} flags - The flags to combine
 * @returns {number} The combined flags
 */
export function and(...flags: number[]) {
    return flags.reduce((acc, flag) => acc & flag, -1);
}

/**
 * Function to combine multiple flags using the OR operator
 * 
 * @param {number[]} flags - The flags to combine
 * @returns {number} The combined flags
 */
export function or(...flags: number[]) {
    return flags.reduce((acc, flag) => acc | flag, 0);
}

/**
 * Function to apply the NOT operator to a flag
 * 
 * @param {number} flag - The flag to apply the NOT operator to
 * @returns {number} The result of the NOT operator
 */
export function not(flag: number) {
    return ~flag;
}

/**
 * Function to make sure a flag has a specific bit set
 * 
 * @param {number} flag - The flag to check
 * @returns {boolean} Whether the flag has the bit set
 */
export function has(flag: number, other: number) {
    return (flag & other) === other;
}

/**
 * Function to check if a flag is set
 * 
 * @param {number} flag - The flag to check
 * @returns {boolean} Whether the flag is set
 */
export function is(flag: number) {
    return flag !== 0;
}

/**
 * Function to unset a flag
 * 
 * @param {number} flag - Source flag
 * @param {number} other - Flag to unset
 * @returns {number} The new flag
 */
export function unset(flag: number, other: number) {
    return flag & ~other;
}

/**
 * Function to toggle (xor) a flag
 * 
 * @param {number} flag - Source flag
 * @param {number} other - Flag to toggle
 * @returns {number} The new flag
 */
export function toggle(flag: number, other: number) {
    return flag ^ other;
}
