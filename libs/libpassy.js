import { StandardWebSocketClient } from "https://deno.land/x/websocket@v0.1.4/mod.ts";
import { Server } from "https://deno.land/std@0.170.0/node/net.ts";
import { Buffer } from "https://deno.land/std@0.173.0/node/buffer.ts";

import { debug } from "./debug-log.js";

/**
 * Connect to a passy server, and expose a TCP server.
 * With no verify, it doesn't verify that this is a passy server,
 * and is therefore prone to crashes and errors.
 * 
 * Note that connectToPassy() does use this internally.
 * @param {string} url URL to attempt to connect to
 * @param {string} password Password to use
 * @param {number} port Port to listen on
 */
export async function connectToPassyNoVerify(url, password, port, internalHasOffset) {
  if (internalHasOffset) console.log("INFO: Tunnel with URL '%s' has had to offset its port. The new port is %s.", url, port);

  const server = new Server();
  server.listen(port);

  server.on("connection", function (socket) {
    debug(
      "DEBUG: CONNECTED: " + socket.remoteAddress + ":" + socket.remotePort
    );

    let isReady = false;
    const bufferPackets = [];

    const wss = new StandardWebSocketClient(url);

    wss.on("close", function () {
      socket.end();
    });

    socket.on("close", function () {
      wss.close();
    });

    socket.on("data", (data) => {
      if (!isReady) {
        bufferPackets.push(data);
      } else {
        wss.send(data);
      }
    });

    wss.on("error", function(err) {
      if (err) console.error(err);
    })

    wss.on("open", function () {
      wss.on("message", async function (rawData) {
        const data = rawData.data; // yo dawg i heard you like data so i datad your data
        const strData = data.toString();

        if (!isReady) {
          if (strData == "AcceptResponse Bearer: false") {
            wss.close();
            server.close();
            
            throw "Invalid password!"
          } else if (strData == "InitProxy: Connected") {
            isReady = true;

            for (const j in bufferPackets) {
              wss.send(bufferPackets[j]);
            }
          }
        } else {
          if (data instanceof Blob) {
            const text = await data.text();

            if (!text.startsWith("Passy: Connected")) socket.write(Buffer.from(await data.arrayBuffer()));
          } else {
            debug("WARN: Recieved unknown data type? Data dump:", data);
            socket.write(data);
          }
        }
      });

      wss.send("Accept: Bearer " + password);
    });
  });

  server.on("error", (e) => {
    if (e.code === "EADDRINUSE") {
      debug("Address in use, retrying with port offset of 1...");

      setTimeout(async() => {
        server.close();
        wss.close();

        await connectToPassyNoVerify(url, password, port+1, true);
      }, 1000);
    } else {
      throw "Internal server error\n\n" + e;
    }
  });
}

/**
 * Connect to a passy server, and expose a TCP server.
 * This version verifies that this is a passy server
 * @param {string} url URL to attempt to connect to
 * @param {string} password Password to use
 * @param {number} port Port to listen on
 */
export async function connectToPassy(url, password, port) {
  const wss = new StandardWebSocketClient(url);

  wss.on("open", async function () {
    wss.send("Accept: IsPassedWS");

    wss.on("message", async function (data) {
      const strData = data.data.toString();

      if (strData == "AcceptResponse IsPassedWS: true") {
        wss.send("Accept: Bearer " + password);
      } else if (strData.startsWith("AcceptResponse Bearer")) {
        const check = strData.split(": ")[1] == "true";

        wss.close();

        if (!check) {
          throw "Invalid password!";
        } else {
          await connectToPassyNoVerify(url, password, port);
        }
      }
    });
  });
}