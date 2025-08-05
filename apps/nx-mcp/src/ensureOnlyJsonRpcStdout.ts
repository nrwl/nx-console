export function ensureOnlyJsonRpcStdout() {
  process.stdout.write = ((
    chunk: any,
    encodingOrCallback?: any,
    callback?: any,
  ) => {
    const message = chunk.toString();

    if (
      !message.startsWith('Content-Length:') &&
      (!message.startsWith('{') || !message.includes('"jsonrpc":'))
    ) {
      process.stderr.write(message);
      return;
    }

    const originalWrite = process.stdout.constructor.prototype.write.bind(
      process.stdout,
    );
    return originalWrite(chunk, encodingOrCallback, callback);
  }) as typeof process.stdout.write;
}
