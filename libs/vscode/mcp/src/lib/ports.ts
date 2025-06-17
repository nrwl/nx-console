import * as net from 'net';

/**
 * Checks if a specific port is available
 * @param port The port to check
 * @returns A promise that resolves to true if the port is available, false otherwise
 */
export async function isSpecificPortAvailable(port: number): Promise<boolean> {
  return isPortAvailable(port);
}

/**
 * Generates a random port number and checks if it's available
 * @returns A promise that resolves to an available port number or null if none found
 */
export async function findAvailablePort(): Promise<number | null> {
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
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (err: any) => {
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
