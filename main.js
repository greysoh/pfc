import { post, isErr } from "./libs/BLT-Wrap.js";
import { handleAxiosError } from "./libs/Handler.js";
import { debug } from "./libs/debug-log.js";

import { connectToPassy } from "./libs/libpassy.js";
import { safeParseInt } from "./libs/safeParseInt.js";

import { welcome } from "./wcmsg.js";

welcome();

// Attempts to see if we need to set up the app
try {
  await Deno.readTextFile("./config.json");
} catch (e) {
  const url = prompt("Please specify an endpoint URL:");
  await Deno.writeTextFile(
    "./config.json",
    JSON.stringify({
      endpoint: url,
    })
  );
}

const config = JSON.parse(await Deno.readTextFile("./config.json"));
debug("INFO: Using '%s' as the base URL", config.endpoint);

if (!config.token) {
  const token = await post(config.endpoint + "/api/v1/users/login", {
    username: prompt("Username:"),
    password: prompt("Password:"),
  });

  if (isErr(token)) {
    handleAxiosError(
      token.response.status,
      token.response.statusText,
      token.response.data.error
    );
    Deno.exit(1);
  }

  config.token = token.data.data.token;

  await Deno.writeTextFile("./config.json", JSON.stringify(config));
}

debug("INFO: Logged in. Fetching list of tunnels...");
const tunnelRequest = await post(config.endpoint + "/api/v1/tunnels", {
  token: config.token,
});

if (isErr(tunnelRequest)) {
  handleAxiosError(
    token.response.status,
    token.response.statusText,
    token.response.data.error
  );
}

const tunnels = tunnelRequest.data.data;

console.log("Choose a tunnel:\n");

for (const tunnelIndex in tunnels) {
  const tunnel = tunnels[tunnelIndex];

  console.log(
    "%s: %s (%s -> :%s)",
    parseInt(tunnelIndex) + 1,
    tunnel.name,
    tunnel.dest,
    tunnel.proxyUrlSettings.port
  );
}

const tunnelChoice = safeParseInt(prompt("\n$:"));

if (tunnelChoice > tunnels.length || tunnelChoice <= 0) {
  console.log("Error: Your tunnel choice was out of range!");
  Deno.exit(1);
}

console.log(tunnelChoice);

const tunnel = tunnels[tunnelChoice - 1];
if (!tunnel) {
  console.log("Error: Misc tunnel choice error. Try not breaking my app next time.");
  Deno.exit(1);
}

debug("INFO: Tunnel choice data:", tunnel);

// Used for detecting the URL to use
const endpointURLObject = new URL(config.endpoint);

const endpointGarbage = endpointURLObject.origin.replace("http", "ws").split(":");
endpointGarbage.pop();

const endpointSameAs = endpointGarbage.join(":");

const url =
  tunnel.proxyUrlSettings.host !== "sameAs"
    ? tunnel.proxyUrlSettings.host
    : endpointSameAs +
      `${
        tunnel.proxyUrlSettings.port != 80 &&
        tunnel.proxyUrlSettings.port != 443
          ? ":" + tunnel.proxyUrlSettings.port
          : ""
      }`;

debug("INFO: Built url is '%s'.", url);
debug("WARN: LAUNCH THE SIRENS!!!");

const tunnelDestData = tunnel.dest.split(":");
const port = tunnelDestData.length != 2 ? safeParseInt(prompt("What port would you like to listen on?")) : tunnelDestData[1]; // TODO

console.log("Started at 'localhost:%s'", port);
await connectToPassy(url, tunnel.passwords[0] ? tunnel.passwords[0] : prompt("What is the password for the tunnel?"), port);