import { readFileSync } from 'fs';
import { gzipSync } from 'zlib';
import { join } from 'path';
import { ls } from 'shelljs';

import { SPECIAL_SOURCE_FILE_MAPPINGS } from './stats.constants';

// @ts-ignore
import * as exploreSourceMap from 'source-map-explorer';

export interface Module {
  file: string;
  size: string;
  type: string;
}

interface FileSize {
  gzipped: number;
  parsed: number;
}

class FileSystemFileSizeGetter {
  read(asset: string, cwd?: string): FileSize {
    const filePath = cwd ? join(cwd, '/', asset) : asset;
    const file = readFileSync(filePath);
    return {
      parsed: file.length,
      gzipped: gzipSync(file).length
    };
  }
}

class FileNameNormalizer {
  cwdPrefixRegexp: RegExp;

  constructor(cwd: string) {
    this.cwdPrefixRegexp = new RegExp(
      `^[\/]*(${cwd.toLowerCase().replace(/^\//, '')})?[\/]*(.*)`
    );
  }

  normalize(s: string) {
    const match = this.cwdPrefixRegexp.exec(s.toLowerCase());
    const file = match ? match[2] : s.toLowerCase();
    for (const k of Object.keys(SPECIAL_SOURCE_FILE_MAPPINGS)) {
      if (file.startsWith(k)) {
        return file.replace(k, SPECIAL_SOURCE_FILE_MAPPINGS[k]);
      }
    }
    return file;
  }
}

export function generateStats(
  _outputPath: string,
  cwd: string,
  earliestTimeStamp: number
) {
  const outputPath = join(cwd, _outputPath);
  const fileSizeGetter = new FileSystemFileSizeGetter();
  // grouped by index as id since webpack ids are sequential numbers
  const modulesByBundle: { [key: string]: ModuleData[] } = {};
  const summary = {
    assets: createSizeData(),
    modules: 0,
    dependencies: 0
  };

  const outputAssets = getAssets(outputPath, earliestTimeStamp);
  const assets: AssetData[] = [];
  const bundles: AssetData[] = [];
  // Windows path uses '\', but webpack and sourcemap contain '/'.
  const normalizedCwd = cwd.replace(/\\/g, '/');
  const fileNormalizer = new FileNameNormalizer(normalizedCwd);

  outputAssets.forEach((asset: string) => {
    const sizes = fileSizeGetter.read(asset, outputPath);
    const modules: ModuleData[] = [];

    summary.assets.parsed += sizes.parsed;
    summary.assets.gzipped += sizes.gzipped;
    assets.push({ file: asset, sizes });

    if (asset.endsWith('.js')) {
      bundles.push({ file: asset, sizes });

      try {
        const sourceMapData = exploreSourceMap(join(outputPath, asset));

        Object.keys(sourceMapData.files).forEach(_file => {
          const size = sourceMapData.files[_file];
          summary.modules += size;

          if (_file === '<unmapped>') {
            modules.push({
              size,
              file: _file,
              isDep: false
            });
          } else {
            const file = fileNormalizer.normalize(_file);
            const isDep = /node_modules/.test(file);

            if (isDep) {
              summary.dependencies += size;
            }

            modules.push({
              size,
              file,
              isDep
            });
          }
        });
      } catch (e) {
        // If we fail to parse sourcemaps it either does not exist, or explorer cannot parse it.
        // Return the chunk as the only module.
        summary.modules += sizes.parsed;
        modules.push({
          size: sizes.parsed,
          file: asset,
          isDep: false
        });
      }
    }

    modulesByBundle[asset] = modules;
  });

  return {
    assets,
    bundles,
    modulesByBundle,
    summary
  };
}

export function calculateStatsFromChunks(cs: Module[]) {
  const assets: AssetData[] = [];
  const summary = {
    assets: createSizeData(),
    modules: 0,
    dependencies: 0
  };
  const bundles: AssetData[] = [];

  cs.forEach((c, idx) => {
    const chunkData = {
      id: String(idx),
      file: c.file,
      sizes: createSizeData()
    };
    const size = parseSizeFromBuildOutput(c.size);

    chunkData.sizes.parsed = size;
    summary.assets.parsed += size;
    summary.modules += size;

    bundles.push(chunkData);
    assets.push({
      file: c.file,
      sizes: chunkData.sizes
    });
  });

  return {
    assets,
    bundles,
    modulesByBundle: {},
    summary
  };
}

/* ------------------------------------------------------------------------------------------------------------------ */

interface AssetData {
  file: string;
  sizes: SizeData;
}

interface SizeData {
  gzipped: number;
  parsed: number;
}

interface ModuleData {
  file: string;
  size: number;
  isDep: boolean;
}

function createSizeData(): SizeData {
  return { gzipped: 0, parsed: 0 };
}

const EXCLUDED_FILES_REGEXP = /^(stats\.json|.*\.map)$/;

function getAssets(p: string, earliestTimeStamp: number) {
  const files = ls('-lR', p).filter((f: any) => {
    if (!f.isFile() || EXCLUDED_FILES_REGEXP.test(f.name)) {
      return false;
    }

    return true;
  });

  return files
    .filter((f: any) => f.mtimeMs >= earliestTimeStamp)
    .map((f: any) => f.name);
}

function parseSizeFromBuildOutput(s: string) {
  console.log(s);
  const matched = s.match(/([\d.]+)\s*(kb|b|mb)/i);
  if (matched) {
    const x = Number(matched[1]);
    switch (matched[2]) {
      case 'b':
        return x;
      case 'kb':
        return x * 1000;
      case 'mb':
        return x * 1000 * 1000;
      // Realistically assets should not be this big
      case 'gb':
        return x * 1000 * 1000 * 1000;
      default:
        return 0;
    }
  } else {
    return 0;
  }
}
