'use strict';
const Package = require('../package.json');


function register (server, options) {
  server.decorate('request', 'timings', null);
  server.ext('onRequest', onRequest);
  server.ext('onPreAuth', onPreAuth);
  server.ext('onPostAuth', onPostAuth);
  server.ext('onPreHandler', onPreHandler);
  server.ext('onPostHandler', onPostHandler);
  server.ext('onPreResponse', onPreResponse);
}

module.exports = {
  register,
  requirements: {
    hapi: '>=17.0.0'
  },
  pkg: Package
};


class Timings {
  constructor () {
    this.entries = new Map();
  }

  start (name, description = null) {
    this.entries.set(name, {
      description,
      start: process.hrtime(),
      duration: null
    });
  }

  end (name) {
    const entry = this.entries.get(name);

    if (entry === undefined) {
      throw new Error(`'${name}' entry not found`);
    }

    const duration = process.hrtime(entry.start);
    entry.duration = duration[0] * 1e3 + duration[1] * 1e-6;
    return entry;
  }
}


function onRequest (request, h) {
  const timings = new Timings();

  request.timings = timings;
  timings.start('total', 'Total');

  return h.continue;
}


function onPreResponse (request, h) {
  let value = '';

  request.timings.end('total');
  request.timings.entries.forEach((val, key, map) => {
    if (value !== '') {
      value += ',';
    }

    value += key;

    if (val.duration !== null) {
      value += `;dur=${val.duration}`;
    }

    if (val.description !== null) {
      value += `;desc="${val.description}"`;
    }
  });

  if (request.response.isBoom) {
    request.response.output.headers['Server-Timing'] = value;
  } else {
    request.response.header('Server-Timing', value);
  }

  return h.continue;
}


function onPreAuth (request, h) {
  request.timings.start('auth', 'Authentication');
  return h.continue;
}


function onPostAuth (request, h) {
  request.timings.end('auth');
  return h.continue;
}


function onPreHandler (request, h) {
  request.timings.start('handler', 'Handler');
  return h.continue;
}


function onPostHandler (request, h) {
  request.timings.end('handler');
  return h.continue;
}
