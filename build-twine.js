import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

// This script finds the tweego binary and runs it with the correct arguments
// to ensure cross-platform compatibility without relying on broken shell shims.

const binPath = path.resolve('node_modules', 'tweego-bin', 'bin', process.platform === 'win32' ? 'tweego.exe' : 'tweego');

// Ensure the binary exists (fix for tweego-bin often missing .exe on Windows)
if (process.platform === 'win32' && !fs.existsSync(binPath)) {
    const rawPath = binPath.replace('.exe', '');
    if (fs.existsSync(rawPath)) {
        fs.renameSync(rawPath, binPath);
    }
}

const args = [
    '-f sugarcube-2',
    '"Twine/src/"',
    '"Twine/modules/"',
    '"Twine/demo_style.css"',
    '-o "Twine/index.html"'
].join(' ');

try {
    console.log(`[BUILD] Running: ${binPath} ${args}`);
    execSync(`"${binPath}" ${args}`, { stdio: 'inherit' });
    console.log('[BUILD] Success: Twine/index.html generated.');
} catch (err) {
    console.error('[BUILD] Failed to compile story.');
    process.exit(1);
}
