// since intellij communicates with the language server via stdout, we need to ensure that only jsonrpc messages are sent to stdout
// this is because intellij will interpret any other messages as errors
export function ensureOnlyJsonRpcStdout() {
  process.stdout.write = ((
    chunk: any,
    encodingOrCallback?: any,
    callback?: any
  ) => {
    const message = chunk.toString();

    if (
      !message.startsWith('Content-Length:') &&
      !message.startsWith('{"jsonrpc":"2.0"')
    ) {
      return;
    }

    const originalWrite = process.stdout.constructor.prototype.write.bind(
      process.stdout
    );
    return originalWrite(chunk, encodingOrCallback, callback);
  }) as typeof process.stdout.write;
}
