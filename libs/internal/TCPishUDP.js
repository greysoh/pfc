// Made to make writing UDP easier by having an 
// implementation of the .on("connection") object,
// in UDP.

// This keeps track of clients by the Node 'rinfo' object.

// (c) Greyson, 2023.

import * as dgram from "https://deno.land/std@0.177.0/node/dgram.ts";

export function createSocketCore(typeOf) {
  const clientList = [];
  const evtList = [];

  const server = dgram.createSocket({
    type: typeOf,
  });

  server.on("message", (msg, rinfo) => {
    const client = clientList.find((i) => i.port == rinfo.port && i.address == rinfo.address);

    // Check to see if we have "connected" already
    if (!client) {
      const clientData = {
        port: rinfo.port,
        address: rinfo.address,
        evtList: []
      };

      clientList.push(clientData);

      const filter = evtList.filter((i) => i.type == "connection");
      for (const connEventListener of filter) {
        connEventListener.func({
          on(type, func) {
            if (type == "data") {
              const clientFetch = clientList.find((i) => i.port == rinfo.port && i.address == rinfo.address);
              const index = clientList.indexOf(clientFetch);

              clientFetch.evtList.push({ type, func });
              clientList.splice(index, 1, clientFetch);
            }
          },
          write: (msg) => server.send(msg, rinfo.port, rinfo.address),

          remoteAddress: rinfo.address,
          remotePort: rinfo.port
        });

        function checkIfMsgEventsRegisteredThenDispatch() {
          setTimeout(function() {
            const client = clientList.find((i) => i.port == rinfo.port && i.address == rinfo.address);
            const filter = client.evtList.filter((i) => i.type == "data");

            if (filter.length == 0) {
              checkIfMsgEventsRegisteredThenDispatch();
            } else {
              for (const msgEventListener of filter) {
                msgEventListener.func(msg);
              }
            }
          }, 100);
        }

        checkIfMsgEventsRegisteredThenDispatch();
      }
    } else {
      const filter = client.evtList.filter((i) => i.type == "data");
      
      for (const msgEventListener of filter) {
        msgEventListener.func(msg);
      }
    }
  });

  return {
    listen: (port) => server.bind(port),
    end: () => server.close(),
    on: (type, func) => {
      if (type == "error") server.on("error", func);
      if (type == "connection") evtList.push({ type, func });
    }
  }
}