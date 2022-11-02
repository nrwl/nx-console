type NxCloudTreeTypes =
  | 'NxCloudRun'
  | 'NxCloudRunDetails'
  | 'NxCloudTasksPlaceholder'
  | 'NxCloudTask';

// https://stackoverflow.com/a/46470717 -- build DRY type guards for subclasses
interface NxCloudTreeDataConstructor<T extends NxCloudTreeDataBase> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- this is a generic type
  new (...args: any[]): T;
  type: NxCloudTreeTypes;
}

export abstract class NxCloudTreeDataBase {
  readonly type = (this.constructor as NxCloudTreeDataConstructor<this>).type;

  instanceOf<T extends NxCloudTreeDataBase>(
    ctor: NxCloudTreeDataConstructor<T>
  ): this is T {
    return this.type === ctor.type;
  }
}
