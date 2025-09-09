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
  // Add exec-gradle.js patches for process tracking
  {
    file: 'src/utils/exec-gradle.js',
    modifications: [
      {
        search: `function execGradleAsync(gradleBinaryPath, args, execOptions = {}) {
    return new Promise((res, rej) => {
        const cp = (0, node_child_process_1.execFile)(gradleBinaryPath, args, {`,
        replace: `function execGradleAsync(gradleBinaryPath, args, execOptions = {}) {
    const startTime = Date.now();
    console.log('🚀 [GRADLE EXEC] Starting Gradle process', { 
        binary: gradleBinaryPath, 
        args: args.filter(arg => arg).join(' '),
        timestamp: new Date().toISOString() 
    });
    
    return new Promise((res, rej) => {
        const cp = (0, node_child_process_1.execFile)(gradleBinaryPath, args, {`,
      },
      {
        search: `        let stdout = Buffer.from('');
        cp.stdout?.on('data', (data) => {
            stdout += data;
        });
        cp.stderr?.on('data', (data) => {
            stdout += data;
        });`,
        replace: `        let stdout = Buffer.from('');
        let totalBytes = 0;
        let lastOutputTime = Date.now();
        let outputLineCount = 0;
        
        // Set up watchdog timer
        const watchdogInterval = setInterval(() => {
            const timeSinceLastOutput = Date.now() - lastOutputTime;
            if (timeSinceLastOutput > 30000) {
                console.warn('⚠️  [GRADLE EXEC] No output for 30+ seconds', {
                    timeSinceLastOutput: Math.round(timeSinceLastOutput / 1000) + 's',
                    totalBytes,
                    outputLineCount,
                    elapsed: Math.round((Date.now() - startTime) / 1000) + 's'
                });
            }
        }, 10000);
        
        cp.stdout?.on('data', (data) => {
            stdout += data;
            totalBytes += data.length;
            lastOutputTime = Date.now();
            outputLineCount += (data.toString().match(/\\n/g) || []).length;
            
            // Log progress every 100KB
            if (totalBytes % 102400 < data.length) {
                console.log('📊 [GRADLE EXEC] Receiving output', {
                    bytes: totalBytes,
                    lines: outputLineCount,
                    elapsed: Math.round((Date.now() - startTime) / 1000) + 's',
                    lastChunk: data.toString().slice(-100).replace(/\\n/g, ' ')
                });
            }
        });
        cp.stderr?.on('data', (data) => {
            stdout += data;
            totalBytes += data.length;
            lastOutputTime = Date.now();
            const errStr = data.toString();
            console.log('⚠️  [GRADLE EXEC] Stderr output', {
                message: errStr.slice(0, 200),
                bytes: data.length
            });
        });`,
      },
      {
        search: `        cp.on('exit', (code) => {
            if (code === 0) {
                res(stdout);
            }
            else {
                rej(stdout);
            }
        });`,
        replace: `        cp.on('exit', (code) => {
            clearInterval(watchdogInterval);
            const elapsed = Math.round((Date.now() - startTime) / 1000);
            console.log('🏁 [GRADLE EXEC] Process exited', {
                code,
                totalBytes,
                outputLineCount,
                elapsed: elapsed + 's',
                success: code === 0
            });
            
            if (code === 0) {
                res(stdout);
            }
            else {
                console.error('❌ [GRADLE EXEC] Process failed', {
                    code,
                    lastOutput: stdout.toString().slice(-500)
                });
                rej(stdout);
            }
        });
        
        cp.on('error', (err) => {
            clearInterval(watchdogInterval);
            console.error('❌ [GRADLE EXEC] Process error', {
                error: err.message,
                elapsed: Math.round((Date.now() - startTime) / 1000) + 's'
            });
            rej(err);
        });`,
      },
    ],
  },
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
      {
        search: `    while (index < projectGraphLines.length) {
        const line = projectGraphLines[index];`,
        replace: `    let processedProjects = new Set();
    let lastLogTime = Date.now();
    let linesSinceLastLog = 0;
    
    while (index < projectGraphLines.length) {
        const line = projectGraphLines[index];
        linesSinceLastLog++;
        
        // Log progress every 50 lines or every 5 seconds
        if (linesSinceLastLog >= 50 || Date.now() - lastLogTime > 5000) {
            console.log('🔄 [GRADLE] Processing progress', {
                currentIndex: index,
                totalLines: projectGraphLines.length,
                percentComplete: Math.round((index / projectGraphLines.length) * 100) + '%',
                currentLine: line?.slice(0, 100),
                projectsProcessed: processedProjects.size
            });
            linesSinceLastLog = 0;
            lastLogTime = Date.now();
        }`,
      },
      {
        search: `        if (line.startsWith('NX_PROJECT_GRAPH_BATCH_START')) {`,
        replace: `        if (line.startsWith('NX_PROJECT_GRAPH_BATCH_START')) {
            const projectName = line.split(' ')[1];
            if (projectName) {
                processedProjects.add(projectName);
                console.log('🏗️ [GRADLE] Starting project batch', {
                    project: projectName,
                    lineIndex: index,
                    totalProcessed: processedProjects.size
                });
            }`,
      },
      {
        search: `        if (line.startsWith('NX_PROJECT_GRAPH_BATCH_END')) {
            index++;
            continue;
        }`,
        replace: `        if (line.startsWith('NX_PROJECT_GRAPH_BATCH_END')) {
            const projectName = line.split(' ')[1];
            console.log('✓ [GRADLE] Completed project batch', {
                project: projectName,
                lineIndex: index
            });
            index++;
            continue;
        }`,
      },
      {
        search: `    }
    return projectGraphReportForAllProjects;`,
        replace: `    }
    
    console.log('✅ [GRADLE] Completed processing all project graph lines', {
        totalProjects: processedProjects.size,
        projects: Array.from(processedProjects),
        nodesCount: Object.keys(projectGraphReportForAllProjects.nodes || {}).length,
        dependenciesCount: projectGraphReportForAllProjects.dependencies?.length || 0
    });
    
    return projectGraphReportForAllProjects;`,
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
  // Add patches for get-project-graph-lines.js
  {
    file: 'src/plugin/utils/get-project-graph-lines.js',
    modifications: [
      {
        search: `async function getNxProjectGraphLines(gradlewFile, gradleConfigHash, gradlePluginOptions) {
    if (process.env.VERCEL) {
        // skip on Vercel
        return [];
    }
    let nxProjectGraphBuffer;`,
        replace: `async function getNxProjectGraphLines(gradlewFile, gradleConfigHash, gradlePluginOptions) {
    if (process.env.VERCEL) {
        // skip on Vercel
        return [];
    }
    console.log('📋 [GRADLE LINES] Getting project graph lines', {
        gradlewFile,
        hash: gradleConfigHash,
        options: gradlePluginOptions,
        timestamp: new Date().toISOString()
    });
    let nxProjectGraphBuffer;`,
      },
      {
        search: `    const projectGraphLines = nxProjectGraphBuffer
        .toString()
        .split(exec_gradle_1.newLineSeparator)
        .filter((line) => line.trim() !== '');`,
        replace: `    const outputString = nxProjectGraphBuffer.toString();
    console.log('📝 [GRADLE LINES] Processing Gradle output', {
        outputSize: outputString.length,
        firstChars: outputString.slice(0, 200),
        lastChars: outputString.slice(-200)
    });
    
    const allLines = outputString.split(exec_gradle_1.newLineSeparator);
    console.log('📊 [GRADLE LINES] Split output into lines', {
        totalLines: allLines.length,
        emptyLines: allLines.filter(line => !line.trim()).length
    });
    
    const projectGraphLines = allLines.filter((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) {
            return false;
        }
        
        // Log every 100th line for progress tracking
        if (index % 100 === 0) {
            console.log('🔍 [GRADLE LINES] Processing line', {
                lineNumber: index,
                linePreview: trimmed.slice(0, 100),
                isTaskLine: trimmed.includes('task') || trimmed.includes('Task')
            });
        }
        
        // Log specific task-related lines
        if (trimmed.includes('Processing task') || trimmed.includes('Processed task')) {
            console.log('📌 [GRADLE LINES] Task line found', {
                lineNumber: index,
                content: trimmed
            });
        }
        
        return true;
    });
    
    console.log('✅ [GRADLE LINES] Filtered project graph lines', {
        originalLines: allLines.length,
        filteredLines: projectGraphLines.length,
        lastLine: projectGraphLines[projectGraphLines.length - 1]?.slice(0, 100)
    });`,
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
