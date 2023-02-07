import { Option } from './schema';

export function isProjectOption(option: Option) {
  return (
    option.name === 'project' ||
    option.name === 'projectName' ||
    option.$default?.$source === 'projectName' ||
    option['x-dropdown'] === 'projects'
  );
}
