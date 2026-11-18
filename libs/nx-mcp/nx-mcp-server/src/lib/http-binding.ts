import {
  hostHeaderValidation,
  originValidation,
} from '@modelcontextprotocol/node';
import type { RequestHandler } from 'express';
import { isIP } from 'net';

const LOOPBACK_HOSTNAMES = ['localhost', '127.0.0.1', '[::1]'];
const WILDCARD_HOSTS = new Set(['0.0.0.0', '::', '[::]']);

export interface HttpBinding {
  /** Addresses to listen on. */
  listenHosts: string[];
  /**
   * Hostnames accepted in the `Host` header. `undefined` when the server
   * listens on every interface, where any name can legitimately reach it.
   */
  allowedHostnames: string[] | undefined;
  /** Hostnames accepted in the `Origin` header of browser requests. */
  allowedOriginHostnames: string[];
  exposedToNetwork: boolean;
}

/**
 * The HTTP endpoint has no authentication, so by default it only listens on
 * loopback. Both address families are bound because clients resolve
 * `localhost` to either. The `Host` and `Origin` checks stop web pages from
 * reaching the loopback server through DNS rebinding.
 */
export function getHttpBinding(host?: string): HttpBinding {
  host = host?.trim().toLowerCase();
  if (!host || host === 'localhost') {
    return {
      listenHosts: ['127.0.0.1', '::1'],
      allowedHostnames: LOOPBACK_HOSTNAMES,
      allowedOriginHostnames: LOOPBACK_HOSTNAMES,
      exposedToNetwork: false,
    };
  }

  const listenHost = host.replace(/^\[(.*)\]$/, '$1');

  if (WILDCARD_HOSTS.has(host)) {
    return {
      listenHosts: [listenHost],
      allowedHostnames: undefined,
      allowedOriginHostnames: LOOPBACK_HOSTNAMES,
      exposedToNetwork: true,
    };
  }

  // Normalized the way the guards parse the Host and Origin headers
  const hostname = new URL(
    `http://${isIP(listenHost) === 6 ? `[${listenHost}]` : listenHost}`,
  ).hostname;
  const allowed = LOOPBACK_HOSTNAMES.includes(hostname)
    ? LOOPBACK_HOSTNAMES
    : [...LOOPBACK_HOSTNAMES, hostname];

  return {
    listenHosts: [listenHost],
    allowedHostnames: allowed,
    allowedOriginHostnames: allowed,
    exposedToNetwork: !LOOPBACK_HOSTNAMES.includes(hostname),
  };
}

export function createRequestGuard(binding: HttpBinding): RequestHandler {
  const validateHost = binding.allowedHostnames
    ? hostHeaderValidation(binding.allowedHostnames)
    : undefined;
  const validateOrigin = originValidation(binding.allowedOriginHostnames);

  return (req, res, next) => {
    if (validateHost && !validateHost(req, res)) {
      return;
    }
    if (!validateOrigin(req, res)) {
      return;
    }
    next();
  };
}
