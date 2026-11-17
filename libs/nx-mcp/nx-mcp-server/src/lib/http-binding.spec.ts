import express from 'express';
import { AddressInfo } from 'net';
import { createServer, request, Server } from 'http';
import {
  createRequestGuard,
  getHttpBinding,
  HttpBinding,
} from './http-binding';

describe('getHttpBinding', () => {
  it('listens on loopback only by default', () => {
    const binding = getHttpBinding();
    expect(binding.listenHosts).toEqual(['127.0.0.1', '::1']);
    expect(binding.allowedHostnames).toEqual([
      'localhost',
      '127.0.0.1',
      '[::1]',
    ]);
    expect(binding.exposedToNetwork).toBe(false);
  });

  it.each(['localhost', 'LOCALHOST', ' localhost ', ''])(
    'treats %j as the loopback default',
    (host) => {
      expect(getHttpBinding(host).listenHosts).toEqual(['127.0.0.1', '::1']);
    },
  );

  it('keeps an explicit loopback address local', () => {
    const binding = getHttpBinding('127.0.0.1');
    expect(binding.listenHosts).toEqual(['127.0.0.1']);
    expect(binding.exposedToNetwork).toBe(false);
  });

  it('allows the given address as Host when listening on it', () => {
    const binding = getHttpBinding('192.168.1.10');
    expect(binding.listenHosts).toEqual(['192.168.1.10']);
    expect(binding.allowedHostnames).toContain('192.168.1.10');
    expect(binding.exposedToNetwork).toBe(true);
  });

  it('normalizes IPv6 addresses the way Host headers are parsed', () => {
    const binding = getHttpBinding('[FE80:0:0:0:0:0:0:1]');
    expect(binding.listenHosts).toEqual(['fe80:0:0:0:0:0:0:1']);
    expect(binding.allowedHostnames).toContain('[fe80::1]');
  });

  it.each(['0.0.0.0', '::', '[::]'])(
    'skips the Host check but keeps the Origin check for %s',
    (host) => {
      const binding = getHttpBinding(host);
      expect(binding.allowedHostnames).toBeUndefined();
      expect(binding.allowedOriginHostnames).toEqual([
        'localhost',
        '127.0.0.1',
        '[::1]',
      ]);
      expect(binding.exposedToNetwork).toBe(true);
    },
  );
});

describe('createRequestGuard', () => {
  let server: Server;
  let port: number;
  let reached: number;

  async function start(binding: HttpBinding) {
    const app = express();
    app.use(createRequestGuard(binding));
    app.all('/mcp', (_req, res) => {
      reached++;
      res.status(200).send('ok');
    });
    server = createServer(app);
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    port = (server.address() as AddressInfo).port;
  }

  function send(headers: Record<string, string>): Promise<number> {
    return new Promise((resolve, reject) => {
      const req = request(
        {
          host: '127.0.0.1',
          port,
          path: '/mcp',
          method: 'POST',
          headers: { 'content-type': 'application/json', ...headers },
        },
        (res) => {
          res.resume();
          resolve(res.statusCode ?? 0);
        },
      );
      req.on('error', reject);
      req.end('{}');
    });
  }

  beforeEach(() => {
    reached = 0;
  });

  afterEach(async () => {
    await new Promise((resolve) => server?.close(resolve));
  });

  describe('loopback binding', () => {
    beforeEach(() => start(getHttpBinding()));

    it.each(['localhost', '127.0.0.1', '[::1]'])(
      'accepts Host %s with any port',
      async (hostname) => {
        expect(await send({ host: `${hostname}:${port}` })).toBe(200);
      },
    );

    it.each(['attacker.example', 'attacker.example:9921', 'localhost.example'])(
      'rejects a rebound Host %s',
      async (host) => {
        expect(await send({ host })).toBe(403);
        expect(reached).toBe(0);
      },
    );

    it('accepts requests without an Origin header', async () => {
      expect(await send({ host: `localhost:${port}` })).toBe(200);
    });

    it('accepts a local Origin', async () => {
      expect(
        await send({
          host: `localhost:${port}`,
          origin: `http://localhost:${port}`,
        }),
      ).toBe(200);
    });

    it.each(['https://attacker.example', 'null'])(
      'rejects a cross-site Origin %s',
      async (origin) => {
        expect(await send({ host: `localhost:${port}`, origin })).toBe(403);
        expect(reached).toBe(0);
      },
    );
  });

  describe('wildcard binding', () => {
    beforeEach(() => start(getHttpBinding('0.0.0.0')));

    it('accepts any Host', async () => {
      expect(await send({ host: 'build-box.internal:9921' })).toBe(200);
    });

    it('still rejects a cross-site Origin', async () => {
      expect(
        await send({
          host: 'build-box.internal:9921',
          origin: 'https://attacker.example',
        }),
      ).toBe(403);
    });
  });
});
