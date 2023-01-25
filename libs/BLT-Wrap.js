import axiod from "https://deno.land/x/axiod@0.26.2/mod.ts";

// Axios (in this case axiod) wrapper that automatically catches errors.
// Should be used with './Handler.js'

export async function get(url, opts) {
  try {
    const data = await axiod.get(url, opts);
    return data;
  } catch (e) {
    return e;
  }
}

export async function post(url, opts) {
  try {
    const data = await axiod.post(url, opts);
    return data;
  } catch (e) {
    return e;
  }
}

export function isErr(resp) {
  if (resp.response && resp.response.status > 399) {
    return true;
  }

  return false;
}