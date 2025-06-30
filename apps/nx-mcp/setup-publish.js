const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../..');
const srcPackageJsonPath = path.resolve(__dirname, 'package.json');
const distDir = path.resolve(rootDir, 'dist/apps/nx-mcp');
const distMainJsPath = path.resolve(distDir, 'main.js');
const distPackageJsonPath = path.resolve(distDir, 'package.json');

console.log('Copying package.json to dist folder (removing nx property)...');
const packageJson = JSON.parse(fs.readFileSync(srcPackageJsonPath, 'utf8'));
delete packageJson.nx;
fs.writeFileSync(
  distPackageJsonPath,
  JSON.stringify(packageJson, null, 2) + '\n',
);
console.log('Package.json copied');

console.log('Adding shebang to main.js...');
const mainJsContent = fs.readFileSync(distMainJsPath, 'utf8');
const shebang = '#!/usr/bin/env node\n';

if (!mainJsContent.startsWith(shebang)) {
  fs.writeFileSync(distMainJsPath, shebang + mainJsContent);
  console.log('Shebang added');
} else {
  console.log('Shebang already present');
}

// Create DXT package
console.log('\nCreating DXT package for Claude Desktop...');

// Create DXT directory structure
const dxtDir = path.resolve(distDir, 'dxt-package');
const serverDir = path.resolve(dxtDir, 'server');

// Clean up previous DXT directory if exists
if (fs.existsSync(dxtDir)) {
  fs.rmSync(dxtDir, { recursive: true, force: true });
}

fs.mkdirSync(dxtDir, { recursive: true });
fs.mkdirSync(serverDir, { recursive: true });

// Copy main.js to server directory (without shebang for DXT)
const mainJsForDxt = mainJsContent.startsWith(shebang) 
  ? mainJsContent.slice(shebang.length) 
  : mainJsContent;
fs.writeFileSync(path.resolve(serverDir, 'main.js'), mainJsForDxt);

// Copy DXT wrapper script
const wrapperScriptPath = path.resolve(__dirname, 'src/dxt-wrapper.js');
if (fs.existsSync(wrapperScriptPath)) {
  const wrapperContent = fs.readFileSync(wrapperScriptPath, 'utf8');
  // Remove shebang from wrapper as it's not needed in DXT
  const wrapperForDxt = wrapperContent.startsWith('#!/usr/bin/env node\n')
    ? wrapperContent.slice('#!/usr/bin/env node\n'.length)
    : wrapperContent;
  fs.writeFileSync(path.resolve(serverDir, 'dxt-wrapper.js'), wrapperForDxt);
} else {
  console.warn('DXT wrapper script not found, using main.js directly');
}

// Copy DXT-README if exists, otherwise fall back to regular README
const dxtReadmePath = path.resolve(distDir, 'DXT-README.md');
const readmePath = path.resolve(distDir, 'README.md');
if (fs.existsSync(dxtReadmePath)) {
  fs.copyFileSync(dxtReadmePath, path.resolve(dxtDir, 'README.md'));
} else if (fs.existsSync(readmePath)) {
  fs.copyFileSync(readmePath, path.resolve(dxtDir, 'README.md'));
}

// Create DXT manifest.json
const dxtManifest = {
  dxt_version: "0.1",
  name: "nx-mcp",
  display_name: "Nx MCP Server",
  version: packageJson.version,
  description: "A Model Context Protocol server for Nx workspaces. Provides AI assistants with tools to understand and manipulate Nx monorepos.",
  long_description: "The Nx MCP Server enables AI assistants like Claude to interact with Nx workspaces. It provides tools for exploring project structure, running generators, executing tasks, and understanding workspace configuration. Perfect for automating development workflows and getting AI assistance with your Nx monorepo.",
  author: {
    name: packageJson.author.name || "Narwhal Technologies Inc",
    email: packageJson.author.email || "hello@nrwl.io",
    url: "https://nx.dev"
  },
  repository: {
    type: "git",
    url: "https://github.com/nrwl/nx-console"
  },
  homepage: "https://nx.dev",
  documentation: "https://github.com/nrwl/nx-console/tree/main/apps/nx-mcp",
  support: "https://github.com/nrwl/nx-console/issues",
  server: {
    type: "node",
    entry_point: "server/dxt-wrapper.js",
    mcp_config: {
      command: "node",
      args: ["${__dirname}/server/dxt-wrapper.js"],
      env: {
        "NX_WORKSPACE_PATH": "${user_config.workspace_path}"
      }
    }
  },
  tools: [
    {
      name: "nx_workspace",
      description: "Get information about the Nx workspace structure"
    },
    {
      name: "nx_project_details", 
      description: "Get details about a specific project"
    },
    {
      name: "nx_generators",
      description: "List available Nx generators"
    },
    {
      name: "nx_generator_schema",
      description: "Get schema for a specific generator"
    },
    {
      name: "nx_open_generate_ui",
      description: "Open the Nx generate UI"
    },
    {
      name: "nx_read_generator_log",
      description: "Read the generator execution log"
    },
    {
      name: "nx_cloud_cipe_details",
      description: "Get Nx Cloud CI Pipeline Execution details"
    },
    {
      name: "nx_cloud_fix_cipe_failure",
      description: "Get logs for failed Nx Cloud tasks"
    },
    {
      name: "nx_docs",
      description: "Search Nx documentation"
    },
    {
      name: "nx_available_plugins",
      description: "List available Nx plugins"
    },
    {
      name: "nx_visualize_graph",
      description: "Visualize the Nx project graph"
    }
  ],
  tools_generated: true,
  keywords: ["nx", "monorepo", "development", "automation", "workspace", "generators"],
  license: "MIT",
  compatibility: {
    claude_desktop: ">=1.0.0",
    platforms: ["darwin", "win32", "linux"]
  },
  user_config: {
    workspace_path: {
      type: "directory",
      title: "Nx Workspace Path",
      description: "Path to your Nx workspace root directory (optional - will use current directory if not specified)",
      required: false
    }
  }
};

// Write DXT manifest
fs.writeFileSync(
  path.resolve(dxtDir, 'manifest.json'),
  JSON.stringify(dxtManifest, null, 2) + '\n'
);
console.log('DXT manifest created');

// Note: Dependencies are already bundled in main.js by esbuild
console.log('Dependencies are already bundled in main.js');

// Create the .dxt file (zip archive)
console.log('Creating .dxt archive...');
const archiver = require('archiver');
const output = fs.createWriteStream(path.resolve(distDir, `nx-mcp-${packageJson.version}.dxt`));
const archive = archiver('zip', {
  zlib: { level: 9 } // Maximum compression
});

output.on('close', () => {
  console.log(`DXT package created: nx-mcp-${packageJson.version}.dxt (${(archive.pointer() / 1024 / 1024).toFixed(2)} MB)`);
  console.log('\nSetup completed successfully!');
  
  // Clean up temporary DXT directory
  fs.rmSync(dxtDir, { recursive: true, force: true });
});

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);

// Add all files from dxtDir to the archive
archive.directory(dxtDir, false);

// Finalize the archive
archive.finalize();
