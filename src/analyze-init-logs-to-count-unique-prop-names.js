// node src/analyze-init-logs-to-count-unique-prop-names.js <path to analyzed `init` directory>
// node src/analyze-init-logs-to-count-unique-prop-names.js ./nodejs-taint/fuzzing/init-analyzed/

const fs = require('fs');
const readline = require('readline');
const path = require('path');

let fileCount = 0;
let testPropCount = 0;

async function readFile(filePath, callback) {
    fileCount++;
    const testPropSet = new Set();
    try {
        const stream = fs.createReadStream(filePath, 'utf8');
        const reader = readline.createInterface({ input: stream, terminal: false });

        for await (const line of reader) {
            try {
                await callback(line, testPropSet);
            } catch (e) {
                console.log(`[error] Analyzing the file ${filePath}, the line: ${line}\n`, e);
            }
        }
    } catch (e) {
        console.log(`[error] Analyzing the file ${filePath}\n`, e);
    }

    testPropCount += testPropSet.size;
}

async function readFiles(dir, callback) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isFile()) {
            await readFile(filePath, callback);
        }
    }
}

const propNames = new Set();
let propCount = 0;

const regexStringProp = /NOT FOUND:.*<String\[\d+\]: #([^>]+)>/;
const regexNumberProp = /NOT FOUND: (\d+)$/;

async function main() {
    await readFiles(process.argv[2], (line, testPropSet) => {
        let match = line.match(regexStringProp);
        if (match) {
            propCount++;
            propNames.add(match[1]);
            testPropSet.add(match[1]);
        } else {
            match = line.match(regexNumberProp);
            if (match) {
                propCount++;
                propNames.add(match[1]);
                testPropSet.add(match[1]);
            }
        }
    });

    // console.log("Collected property names:");
    // propNames.forEach(propName => {
    //     console.log(propName);
    // });

    // console.log('Analyzed files: ' + fileCount);
    // console.log('All found props: ' + propCount);
    // console.log('All unique props:' + propNames.size);

    console.log();
    console.log(`  unique test-property combinations  :  ${testPropCount}`);
}

main();
