'use strict';
const Assert = require('assert');
const Boom = require('@hapi/boom');
const Hapi = require('@hapi/hapi');
const Lab = require('@hapi/lab');
const Timi = require('../lib');
const { describe, it } = exports.lab = Lab.script();


async function getServer () {
  const server = Hapi.server();

  // This extension should be setup before registering the plugin.
  server.ext('onRequest', (request, h) => {
    if (request.path === '/throws-before-onrequest-handler') {
      throw Boom.teapot('test error');
    }

    return h.continue;
  });

  await server.register({ plugin: Timi });

  server.route([
    {
      method: 'GET',
      path: '/happy',
      handler (request, h) {
        return { foo: 'bar' };
      }
    },
    {
      method: 'GET',
      path: '/custom-timings',
      handler (request, h) {
        request.timings.start('miss');
        request.timings.start('region', 'us-east-1');
        request.timings.start('db');
        request.timings.end('db');
        return { bar: 'baz' };
      }
    },
    {
      method: 'GET',
      path: '/end-missing-entry',
      handler (request, h) {
        request.timings.end('snausages');
      }
    }
  ]);

  return server;
}


describe('Server Timing', () => {
  it('returns basic server timing info', async () => {
    const server = await getServer();
    const res = await server.inject({ method: 'GET', url: '/happy' });
    const regex = /^total;dur=.+;desc="Total",auth;dur=.+;desc="Authentication",handler;dur=.+;desc="Handler"$/;

    Assert.strictEqual(regex.test(res.headers['server-timing']), true);
    Assert.strictEqual(res.statusCode, 200);
    Assert.strictEqual(res.payload, JSON.stringify({ foo: 'bar' }));
  });

  it('works with custom timings', async () => {
    const server = await getServer();
    const res = await server.inject({ method: 'GET', url: '/custom-timings' });
    const regex = /^total;dur=.+;desc="Total",auth;dur=.+;desc="Authentication",handler;dur=.+;desc="Handler",miss,region;desc="us-east-1",db;dur=.+$/;

    Assert.strictEqual(regex.test(res.headers['server-timing']), true);
    Assert.strictEqual(res.statusCode, 200);
    Assert.strictEqual(res.payload, JSON.stringify({ bar: 'baz' }));
  });

  it('works with a 404', async () => {
    const server = await getServer();
    const res = await server.inject({ method: 'GET', url: '/not-found' });
    const regex = /^total;dur=.+;desc="Total"$/;

    Assert.strictEqual(regex.test(res.headers['server-timing']), true);
    Assert.strictEqual(res.statusCode, 404);
  });

  it('throws when ending a timing that does not exist', async () => {
    const server = await getServer();
    const res = await server.inject({ method: 'GET', url: '/end-missing-entry' });
    const regex = /^total;dur=.+;desc="Total",auth;dur=.+;desc="Authentication",handler;desc="Handler"$/;

    Assert.strictEqual(regex.test(res.headers['server-timing']), true);
    Assert.strictEqual(res.statusCode, 500);
  });

  it('handles onRequest handlers that throw before timings are setup', async () => {
    const server = await getServer();
    const res = await server.inject({ method: 'GET', url: '/throws-before-onrequest-handler' });

    Assert.strictEqual(res.headers['server-timing'], undefined);
    Assert.strictEqual(res.statusCode, 418);
  });
});
