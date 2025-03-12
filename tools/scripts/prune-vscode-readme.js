const fs = require('fs');
const path = require('path');

// Define input and output file paths
const inputFilePath = path.join(process.cwd(), 'README.md');
const outputFilePath = path.join(process.cwd(), 'apps/vscode/README.md');

// Read the contents of the input file
console.log(`Reading README from ${inputFilePath}`);
let content = fs.readFileSync(inputFilePath, 'utf-8');

// Remove the JetBrains plugin version shield (including any surrounding newlines)
content = content.replace(
  /(\n?)(\[\!\[JetBrains Plugin Version\]\(.*?\)\]\(.*?\))(\n?)/g,
  function (match, newlineBefore, shield, newlineAfter) {
    // If this is in the middle of a list of shields, don't leave extra newlines
    return newlineBefore && newlineAfter ? '\n' : '';
  },
);

// Remove the JetBrains installation instructions
content = content.replace(
  /- \[Nx Console for JetBrains\]\(.*?\) from the JetBrains Marketplace\s*/g,
  '',
);

// Parse the content into sections
// A section starts with one or more # followed by text, and continues until the next section
const sectionRegex = /(^|\n)(#+\s+.*?)(\n[\s\S]*?)(?=\n#+\s+|\n*$)/g;

let newContent = '';
let lastEnd = 0;

// Process each section
for (const match of content.matchAll(sectionRegex)) {
  const [fullMatch, pre, heading, sectionContent] = match;
  const matchStart = match.index;

  // If this is the first match and there's content before it, add that content
  if (matchStart > lastEnd) {
    newContent += content.substring(lastEnd, matchStart);
  }

  // Check if the heading contains "jetbrains" (case-insensitive)
  if (heading.toLowerCase().includes('jetbrains')) {
    console.log(`Removing section: ${heading.trim()}`);
    // Skip this section
  } else {
    // Keep this section
    newContent += pre + heading + sectionContent;
  }

  lastEnd = matchStart + fullMatch.length;
}

// Add any remaining content after the last section
if (lastEnd < content.length) {
  newContent += content.substring(lastEnd);
}

// Ensure directory exists
const outputDir = path.dirname(outputFilePath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Write the pruned content to the output file
console.log(`Writing pruned README to ${outputFilePath}`);
fs.writeFileSync(outputFilePath, newContent, 'utf-8');

console.log('README pruning complete!');
