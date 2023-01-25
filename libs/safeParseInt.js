/**
 * Parse int while checking if it is a number
 * @param {string} str String to parse as an integer
 * @returns {number} Number
 */
export function safeParseInt(str) {
  const parsedInt = parseInt(str);

  // NaN, Number.NaN, or undefined do not work with Deno, when checking this for some reason.
  if (parsedInt != parsedInt) {
    throw new Error("String specified does not contain an integer (number)");
  }

  return parsedInt;
}