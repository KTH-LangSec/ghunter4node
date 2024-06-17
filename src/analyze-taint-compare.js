const fs = require('fs');
const path = require('path');

// module name -> prop name -> sink
var results = {};

const propNameRegExp = new RegExp(`^Property: ([^' \n]*)`);

function handleSarif(parsedData) {
    parsedData.runs.forEach(run => {
        run.results.forEach(r => {
            const message = r.message.text;
            const match1 = message.match(propNameRegExp);
            if (match1) {
                const propName = match1[1];
                if (r.locations.length != 1) {
                    console.warn('Locations size is incorrect: ' + r.locations.length);
                    return;
                }

                const sinkFile = r.locations[0].physicalLocation.artifactLocation.uri;
                const match = sinkFile.match(/\/node\/(.*)/);
                if (!match || !match[1]) {
                    console.warn('Sink is not detected: ' + sinkFile)
                    return;
                }

                const sinkCall = `${match[1]}:${r.locations[0].physicalLocation.region.startLine}:${r.locations[0].physicalLocation.region.startColumn}`;

                if (!results[propName]) {
                    results[propName] = {}
                }

                if (!results[propName][sinkCall]) {
                    results[propName][sinkCall] = 0;
                }

                results[propName][sinkCall]++;
            } else {
                console.warn('Prop name is not found.')
            }
        })
    })
}

function parseSarifFile(filePath) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    try {
        const parsedData = JSON.parse(fileContent);
        handleSarif(parsedData);
    } catch (error) {
        console.error('Error parsing SARIF file:', error);
    }
}

function searchAndParseSarifFiles(directory) {
    const files = fs.readdirSync(directory);

    files.forEach(file => {
        const fullPath = path.join(directory, file);
        const fileStat = fs.statSync(fullPath);

        if (fileStat.isDirectory()) {
            if (file.startsWith('util.')) {
                return;
            } else if (file.startsWith('types.')) {
                return;
            } else if (file.startsWith('errors.')) {
                return;
            } else if (file.startsWith('async_wrap.')) {
                return;
            } else if (file.startsWith('inspector.')) {
                return;
            } else if (file == 'buffer.byteLengthUtf8') {
                return;
            } else if (file == 'serdes.Serializer.Serializer.prototype.writeValue') {
                return;
            } else if (file == 'messaging.MessagePort.MessagePort.prototype.postMessage') {
                return;
            } else if (file == 'fs.read') {
                return;
            }

            searchAndParseSarifFiles(fullPath);
        } else if (path.extname(file).toLowerCase() === '.sarif') {
            parseSarifFile(fullPath);
        }
    });
}

let directoryPath = process.argv[2];
if (!directoryPath) {
    let latestIndex = -1, latestName = null;
    for (const entry of fs.readdirSync("./fuzzing", { withFileTypes: true })) {
        if (entry.isDirectory()) {
            if (entry.name.startsWith("tmp") || entry.name.startsWith("init")) {
                continue;
            }

            const currentIndex = parseInt(entry.name.split("-")[0], 10);
            if (currentIndex > latestIndex) {
                latestIndex = currentIndex;
                latestName = entry.name;
            }
        }
    }
    directoryPath = `./fuzzing/${latestName}/`;
}

searchAndParseSarifFiles(directoryPath);


let gcCount = 0;
for (const [, data] of Object.entries(results)) {
    for (const [, count] of Object.entries(data)) {
        gcCount += count;
    }
}

console.log(JSON.stringify(results));
console.log("gadget candidate count:", gcCount);

fs.writeFileSync(path.resolve(directoryPath, "compare.json"), JSON.stringify(results));
fs.writeFileSync(path.resolve(directoryPath, "count.txt"), `${gcCount}`);
