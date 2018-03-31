'use strict';
const Code = require('code');
const Hapi = require('hapi');
const Lab = require('lab');
const Timi = require('../lib');

// Test shortcuts
const lab = exports.lab = Lab.script();
const { describe, it } = lab;
const { expect } = Code;


async function getServer () {
  const server = Hapi.server();

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

    expect(res.headers['server-timing']).to.match(/^total;dur=.+;desc="Total",auth;dur=.+;desc="Authentication",handler;dur=.+;desc="Handler"$/);
    expect(res.statusCode).to.equal(200);
    expect(res.payload).to.equal(JSON.stringify({ foo: 'bar' }));
  });

  it('works with custom timings', async () => {
    const server = await getServer();
    const res = await server.inject({ method: 'GET', url: '/custom-timings' });

    expect(res.headers['server-timing']).to.match(/^total;dur=.+;desc="Total",auth;dur=.+;desc="Authentication",handler;dur=.+;desc="Handler",miss,region;desc="us-east-1",db;dur=.+$/);
    expect(res.statusCode).to.equal(200);
    expect(res.payload).to.equal(JSON.stringify({ bar: 'baz' }));
  });

  it('works with a 404', async () => {
    const server = await getServer();
    const res = await server.inject({ method: 'GET', url: '/not-found' });

    expect(res.headers['server-timing']).to.match(/^total;dur=.+;desc="Total"$/);
    expect(res.statusCode).to.equal(404);
  });

  it('throws when ending a timing that does not exist', async () => {
    const server = await getServer();
    const res = await server.inject({ method: 'GET', url: '/end-missing-entry' });

    expect(res.headers['server-timing']).to.match(/^total;dur=.+;desc="Total",auth;dur=.+;desc="Authentication",handler;desc="Handler"$/);
    expect(res.statusCode).to.equal(500);
  });
});
