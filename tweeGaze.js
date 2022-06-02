import gaze from 'gaze'
import fs, { existsSync } from 'fs'
import { exec, execFile } from 'child_process';
import Extwee, { HTMLWriter, StoryFormat, StoryFormatParser, TweeWriter } from 'extwee'

let tweegoBinaries = {"win32":"binaries/tweego-2.1.1-windows-x64", "linux":"binaries/tweego-2.1.1-macos-x64", "darwin":"binaries/tweego-2.1.1-macos-x64"};
let tweeBinary = tweegoBinaries[process.platform] || tweegoBinaries["linux"];
console.log({tweeBinary});
console.log("In twee gaze");
let coolDown = 0;

// Watch all .js files/dirs in process.cwd() 
gaze('Twine/*.*', function (err, watcher) {

    // Print all watched files to console
    // var watched = this.watched();
    // console.log(watched)
    
    // On file changed 
    this.on('changed', function (filepath) {
        const mtime = fs.statSync(filepath).mtime;
        
        // If cooldown is finished, allow for file to be converted
        if (mtime - coolDown > 1000) {
            coolDown = mtime

            let [suffix, ...prefix] = filepath.split(".").reverse();
            prefix = prefix.reverse().join(".");
            let command, args;

            // Converting from html to twee 
            if (suffix === "html") {
                let outFile = `${prefix}.tw`
                fs.truncate(outFile, 0, ((err) => {}))
                command = `${tweeBinary}/tweego`;
                args = ["-f", "sugarcube-2", "-d", "-o", `${prefix}.twee`, `${prefix}.html`];
            } 
            
            // Converting from twee/tw to html
            else if (suffix == "twee" || suffix == "tw") {
                command = `${tweeBinary}/tweego`
                args = ["-f", "sugarcube-2", `${prefix}.${suffix}`, "-o", `${prefix}.html`];
            } 
            else {
                console.log(prefix, suffix)
                return
            }

            // Executes shell command 
            execFile(command, args, (err, stdout, stderr) => { 
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