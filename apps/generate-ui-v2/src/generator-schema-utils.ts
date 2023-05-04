import { GeneratorSchema } from '@nx-console/shared/generate-ui-types';
import { Option } from '@nx-console/shared/schema';

export function getGeneratorIdentifier(
  generatorSchema: GeneratorSchema | undefined
) {
  if (!generatorSchema) return '';
  return `${generatorSchema.collectionName}:${generatorSchema.generatorName}`;
}

export type FormValues = Record<
  string,
  string | boolean | number | string[] | undefined
>;

export function extractDefaultValue(
  option?: Option
): string | boolean | number | string[] | undefined {
  if (!option) return;
  if (option.default === undefined || option.default === null) {
    return;
  }
  if (Array.isArray(option.default)) {
    return option.default.map((item) => String(item));
  }
  if (option.type === 'boolean') {
    return !!option.default;
  }
  return String(option.default) ?? '';
}

export function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  type Timer = ReturnType<typeof setTimeout>;
  let timer: Timer;

  return function (this: any, ...args: Parameters<T>) {
    clearTimeout(timer);

    timer = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  }.bind(func);
}
