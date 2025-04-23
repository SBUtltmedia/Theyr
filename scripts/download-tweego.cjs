// ./scripts/install-tweego.js
const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const unzipper = require('unzipper');
const { promisify } = require('util');
const stream = require('stream');
const pipeline = promisify(stream.pipeline);

if (process.env.CI === 'true') {
    console.log('CI environment detected. Skipping Tweego download.');
    process.exit(0);
  }  

// --- Configuration ---
const TWEGO_VERSION = '2.1.1'; // Specify the desired Tweego version
const INSTALL_DIR = path.resolve(__dirname, '..', 'tools', 'tweego'); // Target directory relative to this script
const EXECUTABLE_PATH = path.join(INSTALL_DIR, os.platform() === 'win32' ? 'tweego.exe' : 'tweego');
// --- End Configuration ---

function getTweegoDownloadUrl() {
    const platform = os.platform();
    const arch = os.arch();

    let fileName = '';

    if (platform === 'win32') {
        fileName = `tweego-${TWEGO_VERSION}-windows-${arch === 'x64' ? 'x64' : 'x86'}.zip`;
    } else if (platform === 'darwin') {
        // MacOS might have x64 (Intel) or arm64 (Apple Silicon) builds
        fileName = `tweego-${TWEGO_VERSION}-macos-${arch}.zip`;
    } else if (platform === 'linux') {
        fileName = `tweego-${TWEGO_VERSION}-linux-${arch}.zip`;
    } else {
        throw new Error(`Unsupported platform: ${platform}`);
    }

    return `https://github.com/tmedwards/tweego/releases/download/v${TWEGO_VERSION}/${fileName}`;
}

async function installTweego() {
    console.log(`Checking for Tweego executable at: ${EXECUTABLE_PATH}`);

    // Check if executable already exists
    if (fs.existsSync(EXECUTABLE_PATH)) {
        console.log('Tweego executable already found. Skipping download.');
        // Optional: Add a version check here if needed
        return;
    }

    // Ensure the target directory exists
    console.log(`Ensuring installation directory exists: ${INSTALL_DIR}`);
    fs.mkdirSync(INSTALL_DIR, { recursive: true });

    const downloadUrl = getTweegoDownloadUrl();
    const zipFilePath = path.join(INSTALL_DIR, `tweego-v${TWEGO_VERSION}.zip`);

    try {
        console.log(`Downloading Tweego from ${downloadUrl}...`);
        const response = await axios({
            method: 'GET',
            url: downloadUrl,
            responseType: 'stream',
        });

        // Save the zip file
        await pipeline(response.data, fs.createWriteStream(zipFilePath));
        console.log(`Downloaded zip file to ${zipFilePath}`);

        // Extract the zip file
        console.log(`Extracting ${zipFilePath} to ${INSTALL_DIR}...`);
        await fs.createReadStream(zipFilePath)
            .pipe(unzipper.Extract({ path: INSTALL_DIR }))
            .promise(); // Use .promise() for async/await with unzipper

        console.log('Extraction complete.');

        // Clean up the zip file
        fs.unlinkSync(zipFilePath);
        console.log('Removed zip file.');

        // Set execute permissions (Linux/macOS)
        if (os.platform() !== 'win32') {
            console.log(`Setting execute permissions for ${EXECUTABLE_PATH}`);
            fs.chmodSync(EXECUTABLE_PATH, '755'); // rwxr-xr-x
        }

        console.log(`Tweego v${TWEGO_VERSION} installed successfully to ${EXECUTABLE_PATH}`);

    } catch (error) {
        console.error('Error installing Tweego:', error.message);
        // Clean up potentially partially downloaded/extracted files
        if (fs.existsSync(zipFilePath)) fs.unlinkSync(zipFilePath);
        // Consider removing INSTALL_DIR if it was created by this script and is now empty/incomplete
        process.exit(1); // Exit with error code
    }
}

installTweego();