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
## Help
`--debug`: Returns debug messages, useful for debugging or error reporting  
  
`--clear`: Resets the database  
`--force-ask-port`: Forces pfC to ask you to choose a port  
`--force-ask-pass`: Forces pfC to ask you to input a password  
  
`--libpassy-mitm`: Allows you to snoop traffic (debug must be enabled to show messages) `//TODO,  add`