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
      modernTest.response.status,
      modernTest.response.statusText,
      modernTest.response.data.error
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

  const tokenArgs = {
    username: enableGuestAccess ? "guest" : prompt("Username:"),
    password: enableGuestAccess ? "guest" : prompt("Password:"),
  }

  const token = await post(config.endpoint + "/api/v1/users/login", tokenArgs);

  if (isErr(token)) {
    handleAxiosError(
      token.response.status,
      token.response.statusText,
      token.response.data.error
    );

    if (enableGuestAccess) {
      console.log("\nDetected failure. Guest access is most likely not enabled.");
      console.log("If you want guest access to be enabled, go to the users tab in the Passyfire WebUI and click 'Enable Guest Access'.");
      console.log("If you do not see the option, you either need to update Passyfire, or manually add the guest user.");
      console.log("To do that, add a user with the username and password both set to 'guest'.");
    }

    Deno.exit(1);
  }

  config.token = token.data.data.token;

  const saveLoginForRenewal = prompt("(y/n) Would you like to save your username and password for token renewal, if needed?").toString().toLowerCase().startsWith("y");
  if (saveLoginForRenewal) config.loginDetails = tokenArgs;

  await Deno.writeTextFile("./config.json", JSON.stringify(config));
}

debug("INFO: Using '%s' as the token", config.token);
debug("INFO: Logged in. Fetching list of tunnels...");
const tunnelRequest = await post(config.endpoint + "/api/v1/tunnels", {
  token: config.token,
});

if (isErr(tunnelRequest)) {
  handleAxiosError(
    tunnelRequest.response.status,
    tunnelRequest.response.statusText,
    tunnelRequest.response.data.error
  );

  if (config.loginDetails) {
    console.log("\nAttempting to fix the problem...");
    
    const token = await post(config.endpoint + "/api/v1/users/login", config.loginDetails);

    if (isErr(token)) {
      handleAxiosError(
        token.response.status,
        token.response.statusText,
        token.response.data.error
      )

      console.log("\nFailed to automatically fix the problem.");
      console.log("See 'Code \"TunnelRequest\" Debugging' on the GitHub page on how to address this issue.");
      Deno.exit(1);
    }

    console.log("Success. Saving new token...");
    config.token = token.data.data.token;
    
    await Deno.writeTextFile("./config.json", JSON.stringify(config));

    console.log("You may restart the app.");
  }

  console.log("\nSee 'Code \"TunnelRequest\" Debugging' on the GitHub page on how to address this issue.");

  Deno.exit(1);
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
    port,
    tunnel.proxyUrlSettings.protocol == "UDP"
  );
}

while (true) {
  await new Promise((i) => setTimeout(i, 10000));
}
