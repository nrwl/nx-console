import { GeneratorCollectionInfo } from '@nx-console/shared-schema';
import { readFile } from 'fs/promises';
import { normalize } from 'path';

export async function getGeneratorSchema(
  generatorName: string,
  generators: GeneratorCollectionInfo[],
): Promise<any | undefined> {
  const generatorInfo = {
    collection: generatorName.split(':')[0],
    name: generatorName.split(':')[1],
  };
  const generator = generators.find(
    (g) =>
      g.name === generatorName || g.data?.aliases?.includes(generatorInfo.name),
  );
  if (!generator) {
    return undefined;
  }

  const schemaPath = normalize(
    generator.schemaPath.replace(/^file:\/\/\//, ''),
  );
  const schema = await readFile(schemaPath, 'utf-8');
  const parsedSchema = JSON.parse(schema);
  delete parsedSchema['$schema'];
  delete parsedSchema['$id'];
  parsedSchema.name = generator.name;
  return parsedSchema;
}
