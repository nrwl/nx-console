import { GeneratorCollectionInfo } from '@nx-console/shared-schema';
import { readFile } from 'fs/promises';
import { normalize } from 'path';

export async function getGeneratorSchema(
  generatorName: string,
  generators: GeneratorCollectionInfo[],
): Promise<any | undefined> {
  const generator = generators.find((g) => {
    if (g.name === generatorName) {
      return true;
    }

    // check to see if the generator name has an alias
    const [lib, gen] = generatorName.split(':');
    if (g.collectionName === lib && g.data?.aliases.some((a) => a === gen)) {
      return true;
    }

    return false;
  });
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
