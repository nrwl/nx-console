export function getPackageVersion() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('./package.json').version;
  } catch {
    return '0.0.0';
  }
}
