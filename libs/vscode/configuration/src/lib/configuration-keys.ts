export const CONFIG_KEYS = [
  'enableTelemetry',
  'useNVM',
  'enableGenerateFromContextMenu',
] as const;

/**
 * configuration Keys used for NxConsole
 */
export type ConfigKeys = typeof CONFIG_KEYS[number];
