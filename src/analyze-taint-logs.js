const fs = require('fs');
const readline = require('readline');
const path = require('path');

const TOOL = {
  NAME: "nodejs-something-guided-testing",
  URI: "https://example.com",
  VERSION: "0.1.0",
};

const taintedRegex = / ([^ ]+)\(\) has (\d+)th TAINTED arg/g;
const startRegex = /===== START ===== \[(.*?)\] \[(.*?)\]/g;

function analyzeLineOld(line, resultsDirPath, result) {
  while ((startMatches = startRegex.exec(line)) !== null) {
    result.started = true;
    result.tests.push({
      file: startMatches[1].trim(),
      prop: startMatches[2].trim()
    });
  }

  if (!result.started)
    return;

  while ((taintedMatches = taintedRegex.exec(line)) !== null) {
    const func = taintedMatches[1].trim();
    const arg = `${taintedMatches[2]}`;
    const dirPath = path.join(resultsDirPath, func, arg);
    result.dirs.add(dirPath);
  }

  if (line.includes('EVAL!!!')) {
    const func = 'EVAL';
    const arg = '0';
    const dirPath = path.join(resultsDirPath, func, arg);
    result.dirs.add(dirPath);
  }
}

function summarizeResultOld(result, taintOutputFilePath) {
  const { dirs, tests } = result;
  let content = '';
  if (tests.length == 0)
    content = 'unknown; ' + taintOutputFilePath + '; ???\n'
  else if (tests.length == 1)
    content = tests[0].file + '; ' + taintOutputFilePath + ';\n'
  else
    content = tests.map(v => v.file + '; ' + taintOutputFilePath + '; !!!').join('\n') + '\n'

  for (const dirPath of dirs) {
    if (tests.length == 0) {
      let fullDirPath = dirPath + "-unknown"
      fs.mkdirSync(fullDirPath, { recursive: true });
      fs.appendFileSync(path.join(fullDirPath, "tests.txt"), content)
    } else {
      for (const test of tests) {
        let fullDirPath = dirPath + "-" + test.prop.replace(/^'|'$|\//g, "");
        fs.mkdirSync(fullDirPath, { recursive: true });
        fs.appendFileSync(path.join(fullDirPath, "tests.txt"), content)
      }
    }
  }
}

const SINK_TRACE = 0, SOURCE_TRACE = 1, IRRELEVANT = 2;

function analyzeLineForSarif(line, logFileName, result) {
  const type = line.includes("sink stack")
    ? SINK_TRACE
    : line.includes("source stack")
      ? SOURCE_TRACE
      : IRRELEVANT;

  if (type === SOURCE_TRACE) {
    const logLine = line.replace("[From JS]", "").trim();

    // extract error message
    let trace = logLine.substring(logLine.indexOf(":"), /* end */);
    // remove first line of trace (error info)
    trace = trace.substring(trace.indexOf("\\n") + 2, /* end */);
    // remove second line of trace (always line 2 of the test file)
    trace = trace.substring(trace.indexOf("\\n") + 2, /* end */);

    if (trace.split("\\n")[0].includes("-pp.js") ||
      trace.split("\\n")[0].includes("-pp.mjs")) {
      // Skip if source is in the test
      // return;
    }

    const pollutedValue = logLine
      .substring(0, logLine.indexOf(":"))
      .replace(" source stack", "");

    result.sources.set(pollutedValue, trace);
  } else if (type === SINK_TRACE) {
    const logLine = line.replace("[From JS]", "").trim();
    const message = logLine.substring(0, logLine.indexOf("|"));
    let trace = logLine.substring(logLine.indexOf("|"), /* end */);
    // remove first line of trace (error info)
    trace = trace.substring(trace.indexOf("\\n") + 2, /* end */);
    // remove second line of trace (always node:internal/bootstrap/realm:547:17)
    trace = trace.substring(trace.indexOf("\\n") + 2, /* end */);
    // remove third line of trace (always node:internal/bootstrap/realm:392:40)
    trace = trace.substring(trace.indexOf("\\n") + 2, /* end */);

    const messagePart = message
      .substring(message.indexOf(":") + 2, /* end */);
    let pollutedValue;
    if ((pollutedMatches = /(0(x|X)EFFACED|\[Number\]effaced)\d+/.exec(messagePart)) !== null) {
      pollutedValue = pollutedMatches[0]
        .replace("[Number]", "0x");
    } else {
      pollutedValue = /(0(x|X)EFFACED|\[Number\]effaced)/
        .exec(messagePart)[0]
        .replace("[Number]", "0x");
    }

    const simplifiedMessage = message
      .replace(/\[Number\]effaced\d+/, "[Number]0xEFFACED")
      .replace(/0(x|X)EFFACED\d+/, "0xEFFACED");

    result.sinks.set(pollutedValue, {
      message: simplifiedMessage,
      sinkTrace: trace,
      logFileName
    });
  } else if (startMatches = startRegex.exec(line)) {
    result.pollutedProperty = startMatches[2].trim()
  }
}

function summarizeSarif(result) {
  const { sources, sinks, pollutedProperty } = result;

  // (2) match sinks and sources
  let results = []; //, unmatchedCount = 0;
  for (const [sinkPollutedValue, { message, sinkTrace, logFileName }] of sinks.entries()) {
    let sourceTrace = null;
    for (const [sourcePollutedValue, _sourceTrace] of sources.entries()) {
      // Notes;
      // - Using `.includes` because for the source we know exactly what value
      //   was used for pollution, but at the sink we only know rougly what
      //   value was received - in particular it might be concatinated with
      //   other strings.
      // - Doing case insensitive lookup primarily because sometimes the "x" in
      //   "0xEFFACED" is changed to "X"
      if (sinkPollutedValue.toLowerCase().includes(sourcePollutedValue.toLowerCase())) {
        sourceTrace = _sourceTrace;
      }
    }

    if (sourceTrace === null) {
      console.warn(`[warn] no source trace found for sink value ${sinkPollutedValue} in the file ${logFileName}`);
      continue;
    }

    let location;
    try {
      location = parseTraceLine(
        // location = the location of file at the top of the (sink's) stack trace
        sinkTrace
          .split("\\n")
          .find(line => line.startsWith("    at") && !line.includes("<anonymous>"))
      );
    } catch (e) {
      console.error("[error] parsing sink trace: " + sinkTrace);
      throw e;
    }

    results.push({
      level: "error",
      ruleId: "binding",
      message: {
        text: message + ` (polluted property was ${pollutedProperty})`,
      },
      stacks: [
        {
          message: {
            text: "Stack trace for source",
          },
          frames: traceToFrames(sourceTrace),
        },
        {
          message: {
            text: "Stack trace for sink",
          },
          frames: traceToFrames(sinkTrace),
        },
      ],
      locations: [
        {
          physicalLocation: {
            artifactLocation: {
              uri: location?.file ?? "unknown",
              // index: 0,
            },
            region: {
              startLine: location?.lineNumber ?? 1,
              startColumn: location?.columnNumber ?? 1,
            },
          },
        },
      ],
    });
  }

  return results;
}

function traceToFrames(trace) {
  return trace
    .split("\\n")
    .filter(line => line.startsWith('    at'))
    //.filter(line => !line.includes('<anonymous>'))
    .map(line => parseTraceLine(line))
    .filter(location => location)
    .map(location => {
      return {
        location: {
          physicalLocation: {
            artifactLocation: {
              uri: location.file
            },
            region: {
              startLine: location.lineNumber,
              startColumn: location.columnNumber,
            },
          },
        }
      }
    })
}

function parseTraceLine(line) {
  let file, lineNumber, columnNumber;

  try {
    const expr1 = /\s+at\s(?:async\s|new\s)?([A-z._]+)\s(?:\[[A-z ]+\]\s)?\((.+?)\)/;
    const match1 = expr1.exec(line);
    if (match1) {
      let [_file, _l, _c] = match1[2].split(/:(?=\d)/);
      file = _file;
      lineNumber = _l;
      columnNumber = _c;
    } else {
      const expr2 = /\s+at\s(?:async\s|new\s)?(.+)/;
      const match2 = expr2.exec(line);
      let [_file, _l, _c] = match2[1].split(/:(?=\d)/);
      file = _file;
      lineNumber = _l;
      columnNumber = _c;
    }
  } catch (e) {
    console.log("Error parsing trace line: " + line);
    throw e;
  }

  let lineAdjustment = 0;
  if (file.includes("-pp.js") || file.includes("-pp.mjs")) {
    lineAdjustment = -3;
  }

  const normalizedFile = normalizeFilename(file);
  if (!normalizedFile)
    return undefined;

  return {
    file: normalizeFilename(file),
    lineNumber: parseInt(lineNumber, 10) + lineAdjustment,
    columnNumber: parseInt(columnNumber, 10)
  };
}

function normalizeFilename(filename) {
  if (filename == "<anonymous>")
    return undefined;

  let result = filename
    // restore the original test filename
    // .replace(/^\w*\.<anonymous> \(/, "")
    // .replace(/get opensslCli \[as opensslCli\] \(/, "")
    // .replace(/Server.setupListenHandle \[as _listen2\] \(/, "")
    .replace(/^.*\(/, "")
    .replace(/-pp.js$/, ".js")
    .replace(/-pp.mjs$/, ".mjs")

    // resolve internal code paths
    .replace("node:internal/deps/", `${path.resolve(".")}/deps/`)
    .replace("node:", `${path.resolve(".")}/lib/`)
  // .replace(/node:([a-z]+)/, `${path.resolve(".")}/deno/ext/node/polyfills/$1.ts`)

  if (!result.endsWith(".js") && !result.endsWith(".mjs")) {
    result = result + ".js";
  }

  if (!fs.existsSync(result.replace("file://", ""))) {
    console.warn(`[warn] File "${result}", original: "${filename}" is not found`)
    return undefined;
  }

  if (!result.startsWith("file://")) {
    result = "file://" + result;
  }

  return result;
}

async function analyzeTaintResult(taintOutputFilePath, resultsDirPath) {
  const fileName = taintOutputFilePath.replace(/^.*[\\/]/, '');

  try {
    const stream = fs.createReadStream(taintOutputFilePath, 'utf8');
    const reader = readline.createInterface({ input: stream, terminal: false });

    const resultOld = {
      dirs: new Set(),
      tests: [],
      started: false
    };

    const resultForSarif = {
      sources: new Map(),
      sinks: new Map(),
      pollutedProperty: null
    };

    for await (const line of reader) {
      try {
        analyzeLineOld(line, resultsDirPath, resultOld);
        //analyzeLineForSarif(line, fileName, resultForSarif);
      } catch (e) {
        console.error(`[error] Analyzing the file ${fileName}, the line: ${line}\n`, e);
      }
    }

    summarizeResultOld(resultOld, taintOutputFilePath);
    return undefined;
    //return summarizeSarif(resultForSarif);
  } catch (e) {
    console.error(`[error] Analyzing the file ${fileName}\n`, e);
  }
}

function generateNewResultPath(dirPath) {
  // Regular expression to match 'number-' pattern
  const pattern = /^(\d+)-/;
  let nMax = 0;

  const entries = fs.readdirSync(dirPath);
  for (const entry of entries) {
    const match = entry.match(pattern);
    if (match && fs.statSync(path.join(dirPath, entry)).isDirectory()) {
      try {
        // Extract number and update nMax if it's larger
        const n = parseInt(match[1]);
        if (n > nMax) {
          nMax = n;
        }
      } catch (error) {
        // Skip if the entry after number is not valid
        continue;
      }
    }
  }

  // Generate new subdir name using nMax + 1 and current date
  const newN = nMax + 1;
  const currentDate = new Date().toISOString().replace(/T/, '-').replace(/\..+/, '').replace(/:/g, '-');
  const newSubdirName = `${newN}-${currentDate}`;

  // Return the complete path of the new subdir
  return path.join(dirPath, newSubdirName);
}

function uniqueBy(fn) {
  return (x, i, a) => {
    let found = a.slice(i + 1).find((y) => fn(x) === fn(y));
    return found === undefined;
  }
}

function toSarif(results) {
  return {
    version: "2.1.0",
    "$schema": "http://json.schemastore.org/sarif-2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: TOOL.NAME,
            informationUri: TOOL.URI,
            version: TOOL.VERSION,
            rules: [
              {
                id: "binding",
                name: "Polluted binding value",
                shortDescription: {
                  text: "Pollutable property reaches binding call"
                },
              }
            ]
          },
        },
        results: results.filter(uniqueBy(x => x.message.text)),
      },
    ],
  };
}

function saveSarif(filePath, results) {
  const sarif = toSarif(results);
  const json = JSON.stringify(sarif, null, 2);
  fs.writeFileSync(filePath, json);
}

async function main(args) {
  let sourceDirs = [];
  if (args[0]) {
    let i = 0;
    while (args[i]) {
      sourceDirs.push(args[i++]);
    }
  } else {
    sourceDirs.push('./fuzzing/tmp')
  }

  // create a new folder for the results
  const newDirPath = generateNewResultPath('./fuzzing');
  console.info(newDirPath);
  fs.mkdirSync(newDirPath, { recursive: true });

  const sarifResults = [];
  for (const dir of sourceDirs) {
    for (const entiry of fs.readdirSync(dir)) {
      const entiryPath = path.join(dir, entiry);
      if (fs.statSync(entiryPath).isFile()) {
        const results = await analyzeTaintResult(entiryPath, newDirPath);
      } else if (fs.statSync(entiryPath).isDirectory()) {
        for (const file of fs.readdirSync(entiryPath)) {
          const filePath = path.join(entiryPath, file);
          if (fs.statSync(filePath).isFile()) {
            const results = await analyzeTaintResult(filePath, newDirPath);
          }
        }
      }
    }
  }
}

main(process.argv.slice(2));
