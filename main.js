import { get, post, isErr } from "./libs/BLT-Wrap.js";
import { handleAxiosError } from "./libs/Handler.js";
import { debug } from "./libs/debug-log.js";

import { connectToPassy } from "./libs/libpassy.js";
import { safeParseInt } from "./libs/safeParseInt.js";

import { welcome } from "./wcmsg.js";

welcome();

if (Deno.args.includes("--clear")) localStorage.clear(); 

if (!localStorage.getItem("endpoint")) {
  const url = prompt("Please specify an endpoint URL:");

  const modernTest = await get(url + "/api/v1/static/getScopes");

  if (isErr(modernTest)) {
    handleAxiosError(
      token.response.status,
      token.response.statusText,
      token.response.data.error
    );
    Deno.exit(1);
  }

  localStorage.setItem("endpoint", url);
}

debug("INFO: Using '%s' as the base URL", localStorage.getItem("endpoint"));

if (!localStorage.getItem("token")) {
  console.log(localStorage.getItem("endpoint"));
  const token = await post(localStorage.getItem("endpoint") + "/api/v1/users/login", {
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

  localStorage.setItem("token", token.data.data.token);
}

const config = {
  endpoint: localStorage.getItem("endpoint"),
  token: localStorage.getItem("token")
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
    safeParseInt(tunnelIndex) + 1,
    tunnel.name,
    tunnel.dest,
    tunnel.proxyUrlSettings.port
  );
}

const tunnelChoices = prompt("\n$:").split(",").map((i) => i.trim());

for (const tunnelChoiceUnparsed of tunnelChoices) {
  const tunnelChoice = safeParseInt(tunnelChoiceUnparsed);

  if (tunnelChoice > tunnels.length || tunnelChoice <= 0) {
    console.log("Error: Your tunnel choice was out of range!");
    Deno.exit(1);
  }
  
  debug("INFO: Selected tunnel index is '%s'.", tunnelChoice);
  
  const tunnel = tunnels[tunnelChoice - 1];
  if (!tunnel) {
    console.log("Error: Unknown tunnel choice error.");
    Deno.exit(1);
  }
  
  debug("INFO: Tunnel choice data:", tunnel);
  
  // Used for detecting the URL to use
  const endpointUrlObject = new URL(config.endpoint);
  const endpointProtocolAndHost = endpointUrlObject.origin.replace("http", "ws").split(":");
  const endpointWebsocket = endpointProtocolAndHost.slice(0, -1).join(":");
  
  const url =
    tunnel.proxyUrlSettings.host !== "sameAs"
      ? tunnel.proxyUrlSettings.host
      : endpointWebsocket +
        `${
          tunnel.proxyUrlSettings.port != 80 &&
          tunnel.proxyUrlSettings.port != 443
            ? ":" + tunnel.proxyUrlSettings.port
            : ""
        }`;
  
  debug("INFO: Built url is '%s'.", url);
  
  const tunnelDestData = tunnel.dest.split(":");
  const port = tunnelDestData.length != 2 ? safeParseInt(prompt("What port would you like to listen on?")) : tunnelDestData[1]; // TODO
  
  debug("INFO: Starting...");
  
  console.log("Started tunnel #%s at 'localhost:%s'", tunnelChoice, port);
  
  try {
    connectToPassy(url, tunnel.passwords[0] ? tunnel.passwords[0] : prompt("What is the password for the tunnel?"), port);
  } catch (e) {
    console.error("Unhandled error in instance %s\n\n", tunnelChoice, e);
  }
}

while (true) {
  await new Promise((i) => setTimeout(i, 10000));
}