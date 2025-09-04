#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Applying Gradle logging patches...');

const gradlePackagePath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@nx',
  'gradle',
);

// Check if the gradle package exists
if (!fs.existsSync(gradlePackagePath)) {
  console.log('⚠️  @nx/gradle package not found, skipping patch application');
  process.exit(0);
}

// Define the patches to apply
const patches = [
  {
    file: 'src/plugin/utils/get-project-graph-from-gradle-plugin.js',
    modifications: [
      {
        search: `async function populateProjectGraph(workspaceRoot, gradlewFiles, options) {
    const gradleConfigHash = (0, devkit_1.hashArray)([`,
        replace: `async function populateProjectGraph(workspaceRoot, gradlewFiles, options) {
    console.log('🔍 [GRADLE] Starting project graph population with hash calculation...');
    const gradleConfigHash = (0, devkit_1.hashArray)([`,
      },
      {
        search: `    if (projectGraphReportCache &&
        (!gradleCurrentConfigHash || gradleConfigHash === gradleCurrentConfigHash)) {
        return;
    }`,
        replace: `    if (projectGraphReportCache &&
        (!gradleCurrentConfigHash || gradleConfigHash === gradleCurrentConfigHash)) {
        console.log('🎯 [GRADLE] Using cached project graph report', { hash: gradleConfigHash });
        return;
    }
    console.log('📊 [GRADLE] Cache miss or hash mismatch, generating new project graph...', { 
        currentHash: gradleConfigHash, previousHash: gradleCurrentConfigHash, gradlewFiles: gradlewFiles.length });`,
      },
      {
        search: `        performance.measure(\`\${gradlewFile}GetNxProjectGraphLines\`, getNxProjectGraphLinesStart.name, getNxProjectGraphLinesEnd.name);
        return [...allLines, ...currentLines];`,
        replace: `        performance.measure(\`\${gradlewFile}GetNxProjectGraphLines\`, getNxProjectGraphLinesStart.name, getNxProjectGraphLinesEnd.name);
        console.log('⚡ [GRADLE] Processed gradlew file', { file: gradlewFile, 
            linesCount: currentLines.length, totalLines: allLines.length + currentLines.length });
        return [...allLines, ...currentLines];`,
      },
      {
        search: `    writeProjectGraphReportToCache(projectGraphReportCachePath, projectGraphReportCache);
}`,
        replace: `    writeProjectGraphReportToCache(projectGraphReportCachePath, projectGraphReportCache);
    console.log('✅ [GRADLE] Successfully populated project graph', { 
        hash: gradleConfigHash, totalLines: projectGraphLines.length, 
        nodes: Object.keys(projectGraphReportCache.nodes || {}).length,
        dependencies: projectGraphReportCache.dependencies?.length || 0 });
}`,
      },
      {
        search: `function processNxProjectGraph(projectGraphLines) {
    let index = 0;
    let projectGraphReportForAllProjects = {`,
        replace: `function processNxProjectGraph(projectGraphLines) {
    let index = 0;
    console.log('🔄 [GRADLE] Processing project graph lines...', { totalLines: projectGraphLines.length });
    let projectGraphReportForAllProjects = {`,
      },
    ],
  },
  {
    file: 'src/plugin/dependencies.js',
    modifications: [
      {
        search: `const createDependencies = async (options, context) => {
    const files = await (0, workspace_context_1.globWithWorkspaceContext)(devkit_1.workspaceRoot, Array.from(split_config_files_1.GRALDEW_FILES));`,
        replace: `const createDependencies = async (options, context) => {
    console.log('🔗 [GRADLE] Starting dependency creation...', { options });
    const files = await (0, workspace_context_1.globWithWorkspaceContext)(devkit_1.workspaceRoot, Array.from(split_config_files_1.GRALDEW_FILES));`,
      },
      {
        search: `    const { gradlewFiles } = (0, split_config_files_1.splitConfigFiles)(files);
    await (0, get_project_graph_from_gradle_plugin_1.populateProjectGraph)(context.workspaceRoot, gradlewFiles.map((file) => (0, node_path_1.join)(devkit_1.workspaceRoot, file)), options);`,
        replace: `    const { gradlewFiles } = (0, split_config_files_1.splitConfigFiles)(files);
    console.log('📁 [GRADLE] Found gradlew files', { count: gradlewFiles.length, files: gradlewFiles });
    await (0, get_project_graph_from_gradle_plugin_1.populateProjectGraph)(context.workspaceRoot, gradlewFiles.map((file) => (0, node_path_1.join)(devkit_1.workspaceRoot, file)), options);`,
      },
      {
        search: `    const dependencies = [];
    dependenciesFromReport.forEach((dependencyFromPlugin) => {`,
        replace: `    const dependencies = [];
    console.log('📊 [GRADLE] Processing dependencies from report', { count: dependenciesFromReport.length });
    let processedCount = 0, skippedCount = 0;
    dependenciesFromReport.forEach((dependencyFromPlugin) => {`,
      },
      {
        search: `            if (!sourceProjectName ||
                !targetProjectName ||
                !(0, node_fs_1.existsSync)(dependencyFromPlugin.sourceFile)) {
                return;
            }`,
        replace: `            if (!sourceProjectName ||
                !targetProjectName ||
                !(0, node_fs_1.existsSync)(dependencyFromPlugin.sourceFile)) {
                skippedCount++;
                console.log('⏭️  [GRADLE] Skipping dependency (missing project or file)', { source: dependencyFromPlugin.source, target: dependencyFromPlugin.target, sourceFile: dependencyFromPlugin.sourceFile });
                return;
            }`,
      },
      {
        search: `            (0, devkit_1.validateDependency)(dependency, context);
            dependencies.push(dependency);
        }`,
        replace: `            (0, devkit_1.validateDependency)(dependency, context);
            dependencies.push(dependency);
            processedCount++;
        }`,
      },
      {
        search: `        catch {
            devkit_1.logger.warn(\`Unable to parse dependency from gradle plugin: \${dependencyFromPlugin.source} -> \${dependencyFromPlugin.target}\`);
        }`,
        replace: `        catch {
            skippedCount++;
            console.warn('⚠️  [GRADLE] Failed to process dependency', { source: dependencyFromPlugin.source, target: dependencyFromPlugin.target });
            devkit_1.logger.warn(\`Unable to parse dependency from gradle plugin: \${dependencyFromPlugin.source} -> \${dependencyFromPlugin.target}\`);
        }`,
      },
      {
        search: `    });
    return dependencies;`,
        replace: `    });
    console.log('✅ [GRADLE] Dependency creation completed', { processed: processedCount, skipped: skippedCount, total: dependencies.length });
    return dependencies;`,
      },
    ],
  },
];

// Apply patches
let patchedFiles = 0;
let failedPatches = 0;

for (const patch of patches) {
  const filePath = path.join(gradlePackagePath, patch.file);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${patch.file}, skipping...`);
    failedPatches++;
    continue;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    let fileModified = false;

    for (const mod of patch.modifications) {
      if (content.includes(mod.search)) {
        content = content.replace(mod.search, mod.replace);
        fileModified = true;
      }
    }

    if (fileModified) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`✅ Patched: ${patch.file}`);
      patchedFiles++;
    } else {
      console.log(`⏭️  Already patched or no matches: ${patch.file}`);
    }
  } catch (error) {
    console.error(`❌ Failed to patch ${patch.file}:`, error.message);
    failedPatches++;
  }
}

console.log(
  `\n🎯 Patch application completed: ${patchedFiles} files patched, ${failedPatches} failed`,
);

if (patchedFiles > 0) {
  console.log(
    '🚀 Gradle logging patches applied successfully! CI will now show comprehensive logs.',
  );
} else if (failedPatches === 0) {
  console.log('📋 All patches already applied or no files found to patch.');
}
