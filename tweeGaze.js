import gaze from 'gaze'
import fs, { existsSync } from 'fs'
import path from 'path'
import { exec } from 'child_process';
import Extwee, { HTMLWriter, StoryFormat, StoryFormatParser, TweeWriter } from 'extwee'

let coolDown = 0;

// Watch all .js files/dirs in process.cwd() 
gaze('Twine/**/*.*', function (err, watcher) {

    // Get all watched files 
    var watched = this.watched();
    // console.log(watched)
    
// On file changed 
    this.on('changed', function (filepath) {
        compile(filepath);
    });

    // Initial Build
    console.log("[GAZE] Performing initial build...");
    compile('Twine/src/placeholder.twee'); // Trigger build for the modular source

    function compile(filepath) {
        const mtime = fs.existsSync(filepath) ? fs.statSync(filepath).mtime : Date.now();
        if (mtime - coolDown > 1000) {
            coolDown = mtime

            // We now use the npm script for a cross-platform build
            const command = `npm run build`;

            exec(command, (err, stdout, stderr) => { 
                if (err) {
                    console.error("[GAZE] Build Error:", err)
                } else {
                    console.log(`[GAZE] Built: Twine/index.html`);
                }
            });
        }
    }

    // Get watched files with relative paths 
    var files = this.relative();
});