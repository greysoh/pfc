import { get, post, isErr } from "./libs/BLT-Wrap.js";
import { handleAxiosError } from "./libs/Handler.js";
import { debug } from "./libs/debug-log.js";

import { connectToPassy } from "./libs/libpassy.js";
import { safeParseInt } from "./libs/safeParseInt.js";

import { welcome } from "./wcmsg.js";

welcome();

debug("HELLO: o7 from Indiana");
debug("INFO: CLI options specified are '%s'", Deno.args.join(" "));

async function connectToPassyCatch(...argv) {
  try {
    await connectToPassy(...argv);
  } catch (e) {
    console.error("Unhandled error in instance %s\n\n", tunnelChoice, e);
  }
}

try {
  if (Deno.args.includes("--clear")) throw "Nuke me";
  await Deno.readTextFile("./config.json");
} catch (e) {
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
  const enableGuestAccess = prompt("(y/n) Would you like to log in as a guest?").toString().toLowerCase().startsWith("y");

  const token = await post(config.endpoint + "/api/v1/users/login", {
    username: enableGuestAccess ? "guest" : prompt("Username:"),
    password: enableGuestAccess ? "guest" : prompt("Password:"),
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
debug("INFO: Using '%s' as the token", config.token);
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

const tunnelChoices = prompt("\n$:")
  .split(",")
  .map((i) => i.trim());

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
  const endpointProtocolAndHost = endpointUrlObject.origin
    .replace("http", "ws")
    .split(":");
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
  const port =
    tunnelDestData.length != 2 ||
    Deno.args.join(" ").includes("--force-ask-port")
      ? safeParseInt(prompt("What port would you like to listen on?"))
      : tunnelDestData[1]; // TODO

  debug("INFO: Starting...");

  console.log("Started tunnel #%s at 'localhost:%s'", tunnelChoice, port);

  connectToPassyCatch(
    url,
    !tunnel.passwords[0] || Deno.args.join(" ").includes("--force-ask-pass")
      ? prompt("What is the password for the tunnel?")
      : tunnel.passwords[0],
    port
  );
}

while (true) {
  await new Promise((i) => setTimeout(i, 10000));
}
