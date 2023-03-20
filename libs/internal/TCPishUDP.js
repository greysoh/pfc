// Made to make writing UDP easier by having an 
// implementation of the .on("connection") object,
// in UDP.

// This keeps track of clients by the Node 'rinfo' object.

// (c) Greyson, 2023.

import * as dgram from "https://deno.land/std@0.177.0/node/dgram.ts";

export function createSocketCore(typeOf) {
  const clientList = []; // List of all clients
  const evtList = []; // List of all event listeners

  // Create the basic server
  const server = dgram.createSocket({
    type: typeOf,
  });

  server.on("message", (msg, rinfo) => {
    // Attempt to find the "client"

    // NOTE:
    // Client is in quotes because UDP is a connectionless protocol.
    // Therefore, there is no actual permanent clients.
    // However, at least on local networks, where pfC is expected to run,
    // Each client connects with its IP and a port of the device.
    //
    // Therefore, we can identify each temporary client based on the above.
    //
    // Note that this is not perfect.
    // We cannot tell if we have disconnected or not, due to a connectionless protocol.
    // So, when the client is done, we would have no way of realizing,
    // And could potentially have an entirely new client without realizing.

    const client = clientList.find((i) => i.port == rinfo.port && i.address == rinfo.address);

    // Check to see if we have "connected" already
    // Connected is quoted because of the same reasons stated above.
    if (!client) {
      const clientData = { // Generate a client then push it to the client array
        port: rinfo.port,
        address: rinfo.address,
        evtList: []
      };

      clientList.push(clientData);

      const filter = evtList.filter((i) => i.type == "connection"); // Feed it to all connection event listeners
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

        // Try to feed any message events registered the message
        // If you have bad luck, messages could be sent out of order
        // But, oh well.

        function checkIfMsgEventsRegisteredThenDispatch() {
          setTimeout(function() {
            // Find client because it will get updated
            // We also need to find the data event listener, for the above reason.

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
      // Find the data event listeners for the client
      const filter = client.evtList.filter((i) => i.type == "data");
      
      // Send all the message data
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