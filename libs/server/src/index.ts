export { readAndParseJson } from './lib/utils/utils';

export { findClosestNg } from './lib/utils/utils';

export { readAndCacheJsonFile as readJsonFile } from './lib/utils/utils';

export { Telemetry } from './lib/telemetry';
export * from './lib/extensions';
export * from './lib/utils/read-schematic-collections';
export * from './lib/utils/read-projects';

export interface Store {
  get(key: string, defaultValue?: any): any;
  set(key: string, value: any): void;
  delete(key: string): void;
}
