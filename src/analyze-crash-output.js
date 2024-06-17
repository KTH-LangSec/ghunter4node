const fs = require('fs');
const path = require('path');

function main() {
    const found = new Map();

    const outputs = path.resolve(__dirname, "..", "node", "fuzzing", "output");
    const outputFiles = fs.readdirSync(outputs, { withFileTypes: true });
    for (const entry of outputFiles) {
        if (entry.isFile()) {
            const entryPath = path.resolve(outputs, entry.name);
            const output = fs.readFileSync(entryPath, { encoding: "utf-8" });
            const lines = output.split(/\n/g);
            const [testFile, property, ..._piped] = lines;
            const piped = _piped.filter(line => line !== '');

            let testFileFindings = found.get(testFile);
            if (testFileFindings === undefined) {
                testFileFindings = new Map();
            }

            // Ignore uninteresting errors
            if (
                piped.findIndex((line) => line.startsWith('AssertionError')) !== -1
                ||
                piped.findIndex((line) => line.startsWith('SyntaxError')) !== -1
                ||
                piped.findIndex((line) => line.startsWith('DeprecationWarning')) !== -1
                ||
                piped.findIndex((line) => line.startsWith('TypeError') || line.startsWith('[TypeError')) !== -1
                ||
                piped.findIndex((line) => line === 'Error: invalid') !== -1
                ||
                piped.findIndex((line) => line.startsWith('Error: UNKNOWN:')) !== -1
                ||
                piped.findIndex((line) => line.startsWith('Error: Command failed:')) !== -1
                ||
                piped.findIndex((line) => line.trim().startsWith('throw er;')) !== -1
                ||
                piped.findIndex((line) => line.includes('Skipped: Windows specific test.')) !== -1
                ||
                piped.findIndex((line) => line.match(/(<ref *\d+> )?Error: spawn(Sync)? \S+ ENOENT/)) !== -1
                ||
                piped.findIndex((line) => line.match(/gen=\d+, pid=\d+/)) !== -1
                ||
                (piped.length === 1 && piped[0] === 'ok')
                ||
                (piped.length === 1 && piped[0].endsWith('iamabadcommand: not found'))
                ||
                (piped.length === 1 && piped[0].match(/^C*$/))
                ||
                ((piped.length === 2) && piped[0].trim() === "[stdout]" && piped[1].trim() === "[stderr]")
                ||
                ((piped.length === 2 || piped.length === 3) && piped[0].match(/ExperimentalWarning: Permission is an experimental feature/))
            ) {
                // pass;
            } else {
                testFileFindings.set(property, piped.join("\n"));
            }

            found.set(testFile, testFileFindings);
        }
    }

    const testsWithErrorCount = found.size;
    const gcCount = Array.from(found.values()).reduce((sum, cur) => sum + cur.size, 0);

    const foundClean = new Map();
    for (const [testFile, testFileFindings] of found.entries()) {
        if (testFileFindings.size > 0) {
            foundClean.set(testFile, testFileFindings);
        }
    }

    console.log("RESULTS:");
    console.log(foundClean);
    console.log(`TOTAL: ${gcCount} gadget candidates\tacross ${foundClean.size} tests`);
    console.log(`   for ${outputFiles.length} crashes\t\tacross ${testsWithErrorCount} tests`);
}

main();
