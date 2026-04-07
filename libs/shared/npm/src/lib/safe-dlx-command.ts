export interface SafeDlxCommand {
  /** The dlx command prefix to place before the package name */
  prefix: string;
  /** Environment variables to set when spawning for lifecycle script safety */
  env: Record<string, string>;
}

/**
 * Builds a dlx command prefix that blocks lifecycle scripts during package
 * installation. Returns both the command prefix and any environment variables
 * needed for the spawn/exec call.
 *
 * Usage: `${prefix} <package>@latest <command> <flags>`
 *
 * @param dlx - The dlx command from getPackageManagerCommand().dlx
 * @param options.npxCacheDir - Optional cache directory (only applies to npx)
 */
export function buildSafeDlxCommand(
  dlx: string | undefined,
  options?: { npxCacheDir?: string },
): SafeDlxCommand {
  const cacheParam = options?.npxCacheDir
    ? `--cache=${options.npxCacheDir}`
    : '';

  // 'yarn' (without 'dlx') is an outdated config from old nx versions.
  // undefined means detection failed. Both fall back to npx.
  if (!dlx || dlx === 'npx' || dlx === 'yarn') {
    return {
      prefix: ['npx', '-y', '--ignore-scripts', cacheParam]
        .filter(Boolean)
        .join(' '),
      env: {},
    };
  }

  // yarn berry (v2+) removed --ignore-scripts from dlx; use env var instead
  if (dlx === 'yarn dlx') {
    return {
      prefix: 'yarn dlx',
      env: { YARN_ENABLE_SCRIPTS: 'false' },
    };
  }

  // pnpm dlx doesn't support --ignore-scripts; use npm config env var
  if (dlx === 'pnpm dlx' || dlx === 'pnpx') {
    return {
      prefix: dlx,
      env: { npm_config_ignore_scripts: 'true' },
    };
  }

  // bun doesn't run lifecycle scripts for bunx/bun dlx by default
  if (dlx === 'bunx' || dlx === 'bun dlx' || dlx === 'bun x') {
    return {
      prefix: dlx,
      env: {},
    };
  }

  // Unknown dlx command - fall back to npx for safety
  return {
    prefix: ['npx', '-y', '--ignore-scripts', cacheParam]
      .filter(Boolean)
      .join(' '),
    env: {},
  };
}
