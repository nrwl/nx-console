interface SchematicDescription {
  name: string;
  description: string;
  collection: string;
  path: string;
}

interface SchematicDescriptionColltion {
  name: string;
  schematics: Array<Schematic>;
}
