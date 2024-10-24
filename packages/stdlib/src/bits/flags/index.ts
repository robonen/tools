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
