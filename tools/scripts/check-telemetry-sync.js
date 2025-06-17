const fs = require('fs');
const path = require('path');

function extractTypeScriptEvents() {
  const filePath = path.join(
    __dirname,
    '../../libs/shared/telemetry/src/lib/telemetry-types.ts',
  );

  if (!fs.existsSync(filePath)) {
    console.error(`❌ TypeScript telemetry file not found: ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  // Find the TelemetryEvents type definition
  const typeMatch = content.match(
    /export type TelemetryEvents\s*=\s*([\s\S]*?);/,
  );
  if (!typeMatch) {
    console.error(
      '❌ Could not find TelemetryEvents type definition in TypeScript file',
    );
    process.exit(1);
  }

  const typeDefinition = typeMatch[1];

  // Extract all event strings from the union type
  const eventMatches = typeDefinition.match(/'\s*([^']+)\s*'/g);
  if (!eventMatches) {
    console.error('❌ Could not extract events from TypeScript file');
    process.exit(1);
  }

  // Clean up the events and filter out empty strings
  const events = eventMatches
    .map((match) => match.replace(/'/g, '').trim())
    .filter((event) => event.length > 0)
    .sort();

  return events;
}

function extractKotlinEvents() {
  const filePath = path.join(
    __dirname,
    '../../apps/intellij/src/main/kotlin/dev/nx/console/telemetry/TelemetryTypes.kt',
  );

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Kotlin telemetry file not found: ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  // Extract all enum entries with their string values
  const enumMatches = content.match(/[A-Z_]+\("([^"]+)"\)/g);
  if (!enumMatches) {
    console.error('❌ Could not extract events from Kotlin file');
    process.exit(1);
  }

  // Extract the event strings from the enum values
  const events = enumMatches
    .map((match) => {
      const eventMatch = match.match(/\("([^"]+)"\)/);
      return eventMatch ? eventMatch[1] : '';
    })
    .filter((event) => event.length > 0)
    .sort();

  return events;
}

console.log('🔍 Checking telemetry event synchronization...\n');

const tsEvents = extractTypeScriptEvents();
const ktEvents = extractKotlinEvents();

console.log(`📊 Found ${tsEvents.length} events in TypeScript`);
console.log(`📊 Found ${ktEvents.length} events in Kotlin\n`);

const missingInKotlin = tsEvents.filter((e) => !ktEvents.includes(e));
const missingInTypeScript = ktEvents.filter((e) => !tsEvents.includes(e));

if (missingInKotlin.length === 0 && missingInTypeScript.length === 0) {
  console.log('✅ Telemetry events are synchronized!');
  process.exit(0);
} else {
  console.log('❌ Telemetry events are NOT synchronized!');

  if (missingInKotlin.length > 0) {
    console.log('\n🔴 Missing in JetBrains:');
    missingInKotlin.forEach((event) => console.log(`  - ${event}`));
  }

  if (missingInTypeScript.length > 0) {
    console.log('\n🔴 Missing in VSCode:');
    missingInTypeScript.forEach((event) => console.log(`  - ${event}`));
  }

  process.exit(1);
}
