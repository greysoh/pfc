/**
 * Handles an axios error
 * @param {number} errCode HTTP error code (if applicable)
 * @param {string} errText Error text (ex. if errCode == 403, should be "Forbidden")
 * @param {string} respErrMessage Response error message if included in the body
 */
export function handleAxiosError(errCode, errText, respErrMessage) {
  console.log("Request failed with code '%s %s'", errCode, errText);
  console.log("  - " + respErrMessage);
}