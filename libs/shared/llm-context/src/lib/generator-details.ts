import { GeneratorCollectionInfo } from '@nx-console/shared-schema';
import { readFile } from 'fs/promises';
import { normalizePath } from 'nx/src/utils/path';

async function readSchemaWithFallback(schemaPath: string): Promise<string> {
  const normalizedPath = normalizePath(schemaPath);
  try {
    return await readFile(normalizedPath, 'utf-8');
  } catch (e: any) {
    if (e.code === 'ENOENT' && normalizedPath.includes('/dist/')) {
      const srcPath = normalizedPath.replace('/dist/', '/src/');
      return await readFile(srcPath, 'utf-8');
    }
    throw e;
  }
}

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

  const schemaPath = generator.schemaPath.replace(/^file:\/\/\//, '');
  const schema = await readSchemaWithFallback(schemaPath);
  const parsedSchema = JSON.parse(schema);
  delete parsedSchema['$schema'];
  delete parsedSchema['$id'];
  parsedSchema.name = generator.name;
  return parsedSchema;
}
