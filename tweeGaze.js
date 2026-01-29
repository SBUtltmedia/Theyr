import gaze from 'gaze'
import fs, { existsSync } from 'fs'
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
        // Execute command
        const mtime = fs.statSync(filepath).mtime;
        if (mtime - coolDown > 1000) {
            coolDown = mtime

            let [suffix, ...prefix] = filepath.split(".").reverse();
            prefix = prefix.reverse().join(".");
            let command, args;
            if (suffix == "html") {
                let outFile = `${prefix}.tw`
                fs.truncate(outFile, 0, ((err) => {}))

                command = `npx tweego -f sugarcube-2 -d -o "${prefix}.twee" "${prefix}.html"`;
            } 
            else if (suffix == "twee" || suffix == "tw" || suffix == "js" || suffix == "css") {
                let targetTwee = `${prefix}.${suffix}`;
                let outputHtml = `${prefix}.html`;

                if (suffix === 'js' || suffix === 'css') {
                    targetTwee = 'Twine/LeanDemo.twee';
                    outputHtml = 'Twine/LeanDemo.html';
                }

                command = `npx tweego -f sugarcube-2 "${targetTwee}" Twine/modules/ Twine/demo_style.css -o "${outputHtml}"`;
            } 
            else {
                console.log(prefix, suffix)
                return
            }

            // Executes shell command 
            exec(command, (err, stdout, stderr) => { 
                if (err) {
                    console.error(err)
                }
            });

            // console.log(existsSync());
            // console.log(existsSync(`${prefix}.${suffix}`))
            console.log(filepath + ' was changed');
        }
    });

    // Get watched files with relative paths 
    var files = this.relative();
});