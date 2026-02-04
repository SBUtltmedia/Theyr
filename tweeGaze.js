import gaze from 'gaze'
import fs, { existsSync } from 'fs'
import path from 'path'
import { exec } from 'child_process';
import Extwee, { HTMLWriter, StoryFormat, StoryFormatParser, TweeWriter } from 'extwee'

// Get story name from environment variable (default: 'default')
const storyName = process.env.STORY || 'default';
const storyPath = `Twine/${storyName}`;

let coolDown = 0;

// Watch story-specific folder and shared modules
const watchPatterns = [
    `${storyPath}/**/*.*`,
    'Twine/modules/**/*.*'
];

console.log(`[GAZE] Watching story: ${storyName}`);
console.log(`[GAZE] Watch patterns:`, watchPatterns);

gaze(watchPatterns, function (err, watcher) {
    if (err) {
        console.error("[GAZE] Error setting up watcher:", err);
        return;
    }

    // On file changed
    this.on('changed', function (filepath) {
        compile(filepath);
    });

    // Initial Build
    console.log("[GAZE] Performing initial build...");
    compile(`${storyPath}/src/placeholder.twee`);

    function compile(filepath) {
        const mtime = fs.existsSync(filepath) ? fs.statSync(filepath).mtime : Date.now();
        if (mtime - coolDown > 1000) {
            coolDown = mtime

            // Pass story name to build script
            const command = `npm run build -- ${storyName}`;

            exec(command, (err, stdout, stderr) => {
                if (err) {
                    console.error("[GAZE] Build Error:", err)
                } else {
                    console.log(`[GAZE] Built: ${storyPath}/index.html`);
                }
            });
        }
    }
});