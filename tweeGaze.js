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

            // Detect which story to build based on the filepath
            // Example: Twine/demo/src/Start.twee -> demo
            const relativePath = path.relative(process.cwd(), filepath);
            const pathParts = relativePath.split(path.sep);
            let storyName = 'default';
            
            if (pathParts[0] === 'Twine' && pathParts[1] && pathParts[1] !== 'modules' && pathParts[1] !== 'src') {
                storyName = pathParts[1];
            }

            console.log(`[GAZE] Change detected in ${storyName}. Building...`);
            const command = `node build-twine.js ${storyName}`;

            exec(command, (err, stdout, stderr) => { 
                if (err) {
                    console.error(`[GAZE] Build Error (${storyName}):`, err)
                } else {
                    console.log(`[GAZE] Built: Twine/${storyName}/index.html`);
                }
            });
        }
    }
});