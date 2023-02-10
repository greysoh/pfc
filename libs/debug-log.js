/**
 * Console.log but it only logs if it has the environment variable "DEBUG" set to anything that isn't an empty string
 * @param  {...any} argv Arguments for console.log
 */
export function debug(...argv) {
  if (Deno.args[0].includes("--debug")) console.log(...argv);
}