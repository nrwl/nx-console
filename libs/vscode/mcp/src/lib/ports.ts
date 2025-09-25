import * as net from 'net';

/**
 * Finds an available port, optionally checking a preferred port first
 * @param preferredPort - Optional preferred port to check first
 * @returns A promise that resolves to an available port number or null if none found
 */
export async function findAvailablePort(
  preferredPort?: number,
): Promise<number | null> {
  // If a preferred port is provided, only check that specific port
  if (preferredPort !== undefined) {
    if (await isPortAvailable(preferredPort)) {
      return preferredPort;
    }
    // If the preferred port is not available, return null (no fallback)
    return null;
  }

  // Try up to 100 times to find an available port
  for (let i = 0; i < 100; i++) {
    // Generate a random port between 9000 and 10000
    const port = Math.floor(Math.random() * 1000) + 9000;

    if (await isPortAvailable(port)) {
      return port;
    }
  }

  return null;
}

/**
 * Checks if a port is available by attempting to create a server on that port
 * @param port The port to check
 * @returns A promise that resolves to true if the port is available, false otherwise
 */
export function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => {
      resolve(false);
    });

    server.once('listening', () => {
      server.close(() => {
        resolve(true);
      });
    });

    server.listen(port);
  });
}
