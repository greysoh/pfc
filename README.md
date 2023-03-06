# pfC
passyfire Client
## What is this?
A better version of `OpenPassy`, ported to `Deno`, and CLI-fied, specific to the Passyfire project and servers.
## How do I build/run?
You can run it by:
```bash
$ deno run --allow-read --allow-write --allow-net main.js
```
And if you want to compile it:
```bash
$ deno compile --allow-read --allow-write --allow-net main.js
```
## CLI Opts
`--debug`: Returns debug messages, useful for debugging or error reporting  
  
`--clear`: Resets the database  
`--force-ask-port`: Forces pfC to ask you to choose a port  
`--force-ask-pass`: Forces pfC to ask you to input a password  
  
`--libpassy-mitm`: Allows you to snoop traffic (debug must be enabled to show messages) `//TODO,  add`
## Debugging
### Code "TunnelRequest" Debugging
Check if the user you are using has the permission "Get routes" (known internally as permissions.routes.get) enabled.  
  
If the user you are using has that permission, try resetting the application and logging back in again.  
  
If that doesn't work, post an issue on GitHub, with the console log, as well as the option `--debug` enabled.