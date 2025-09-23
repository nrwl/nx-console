// scripts/install-mcp-publisher.js
// Usage: node scripts/install-mcp-publisher.js --ref <commit-or-tag>
//        MCP_PUBLISHER_REF=<ref> node scripts/install-mcp-publisher.js
import { execSync } from 'child_process'
import { existsSync, mkdirSync, copyFileSync, chmodSync } from 'fs'
import { join } from 'path'

function run(cmd, env = {}) {
  return execSync(cmd, { stdio: 'inherit', env: { ...process.env, ...env } });
}

const refArg = process.argv.find((a) => a === '--ref')
  ? process.argv[process.argv.indexOf('--ref') + 1]
  : null;
const REF = process.env.MCP_PUBLISHER_REF || refArg;

if (!REF) {
  console.error(
    'ERROR: Provide a ref via --ref <commit|tag> or MCP_PUBLISHER_REF env var.',
  );
  process.exit(1);
}

// Basic sanity: ensure Go is available
try {
  execSync('go version', { stdio: 'inherit' });
} catch {
  console.error(
    'ERROR: Go is not installed or not on PATH. Install Go 1.24.x first.',
  );
  process.exit(1);
}

const binDir = join(process.cwd(), 'bin');
mkdirSync(binDir, { recursive: true });

// Install the publisher at the exact ref
const module = 'github.com/modelcontextprotocol/registry/cmd/publisher';
console.log(`Installing ${module}@${REF} ...`);
run(`go install ${module}@${REF}`, { GOBIN: binDir, GO111MODULE: 'on' });

// Resolve installed name and normalize to ./mcp-publisher
const candidates = ['publisher', 'mcp-publisher'].map((n) =>
  join(binDir, process.platform === 'win32' ? `${n}.exe` : n),
);
const found = candidates.find((p) => existsSync(p));
if (!found) {
  console.error(
    `ERROR: Could not find installed binary in ${binDir}. Looked for: ${candidates.join(', ')}`,
  );
  process.exit(1);
}

const target = join(
  process.cwd(),
  process.platform === 'win32' ? 'mcp-publisher.exe' : 'mcp-publisher',
);
copyFileSync(found, target);
chmodSync(target, 0o755);

console.log(`✅ Installed mcp-publisher from ${REF} -> ${target}`);
try {
  execSync(`${target} --help`, { stdio: 'inherit' });
} catch { }
