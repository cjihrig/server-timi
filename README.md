# server-timi

[![Current Version](https://img.shields.io/npm/v/server-timi.svg)](https://www.npmjs.org/package/server-timi)
[![Build Status via Travis CI](https://travis-ci.org/cjihrig/server-timi.svg?branch=master)](https://travis-ci.org/cjihrig/server-timi)
![Dependencies](http://img.shields.io/david/cjihrig/server-timi.svg)
[![belly-button-style](https://img.shields.io/badge/eslint-bellybutton-4B32C3.svg)](https://github.com/cjihrig/belly-button)

[Server timing API](https://w3c.github.io/server-timing/) plugin for [hapi](https://github.com/hapijs/hapi).

## Example

`server-timi` does not accept any options. To use it, register the plugin with a hapi server, and the `Server-Timing` header will be automatically added to the server's responses.

```javascript
'use strict';
const Hapi = require('@hapi/hapi');
const ServerTimi = require('server-timi');

async function main () {
  const server = Hapi.server({ port: 8080 });

  await server.register({ plugin: ServerTimi });

  server.route({
    method: 'GET',
    path: '/foo',
    handler (request, h) {
      return { foo: 'bar' };
    }
  });

  await server.start();
}

main();
```
