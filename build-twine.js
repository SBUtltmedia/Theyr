import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

// This script finds the tweego binary and runs it with the correct arguments
// to ensure cross-platform compatibility without relying on broken shell shims.

// Get story name from args or environment variable (default: 'default')
const storyName = process.argv[2] || process.env.STORY || 'default';
const storyPath = `Twine/${storyName}`;

// Validate story folder exists
if (!fs.existsSync(storyPath)) {
    console.error(`[BUILD] Error: Story folder not found: ${storyPath}`);
    console.error(`[BUILD] Available stories:`);
    fs.readdirSync('Twine', { withFileTypes: true })
        .filter(d => d.isDirectory() && d.name !== 'modules' && fs.existsSync(`Twine/${d.name}/src`))
        .forEach(d => console.error(`  - ${d.name}`));
    process.exit(1);
}

const binPath = path.resolve('node_modules', 'tweego-bin', 'bin', process.platform === 'win32' ? 'tweego.exe' : 'tweego');

// Ensure the binary exists (fix for tweego-bin often missing .exe on Windows)
if (process.platform === 'win32' && !fs.existsSync(binPath)) {
    const rawPath = binPath.replace('.exe', '');
    if (fs.existsSync(rawPath)) {
        fs.renameSync(rawPath, binPath);
    }
}

// Build args: story src + shared modules + story css -> story index.html
const cssPath = `${storyPath}/css/style.css`;
const args = [
    '-f sugarcube-2',
    `"${storyPath}/src/"`,
    '"Twine/modules/"',
    fs.existsSync(cssPath) ? `"${cssPath}"` : '',
    `-o "${storyPath}/index.html"`
].filter(Boolean).join(' ');

try {
    console.log(`[BUILD] Building story: ${storyName}`);
    console.log(`[BUILD] Running: ${binPath} ${args}`);
    execSync(`"${binPath}" ${args}`, { stdio: 'inherit' });
    console.log(`[BUILD] Success: ${storyPath}/index.html generated.`);
} catch (err) {
    console.error(`[BUILD] Failed to compile story: ${storyName}`);
    process.exit(1);
}
