/**
 * Console.log but it only logs if it has the environment variable "DEBUG" set to anything that isn't an empty string
 * @param  {...any} argv Arguments for console.log
 */
export function debug(...argv) {
  if (Deno.env.get("DEBUG")) {
    console.log(...argv)
  }
}