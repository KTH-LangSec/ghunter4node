const fs = require('fs');
const readline = require('readline');
const path = require('path');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

const TOOL = {
  NAME: "nodejs-something-guided-testing",
  URI: "https://example.com",
  VERSION: "0.1.0",
};

const taintedRegex = / ([^ ]+)\(\) has (\d+)th TAINTED arg/g;
const startRegex = /===== START ===== \[(.*?)\] \['?(.*?)'?\]/g;

const SINK_TRACE = 0, SOURCE_TRACE = 1, IRRELEVANT = 2;

async function readFile(filePath, callback) {
  try {
    const stream = fs.createReadStream(filePath, 'utf8');
    const reader = readline.createInterface({ input: stream, terminal: false });

    for await (const line of reader) {
      try {
        await callback(line);
      } catch (e) {
        console.log(`[error] Analyzing the file ${filePath}, the line: ${line}\n`, e);
      }
    }
  } catch (e) {
    console.log(`[error] Analyzing the file ${filePath}\n`, e);
  }
}

async function readTestsFiles(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      await readTestsFiles(filePath, callback); // Recursive call for directories
    } else if (stat.isFile() && file === 'tests.txt') {
      await readFile(filePath, callback);
    }
  }
}

function findTraceId(trace) {
  const calls = trace.split("\\n");
  let found = false;
  let i;
  for (i = 0; i < calls.length; i++) {
    // take file location in ()
    if ((match = /\((.*)\)$/.exec(calls[i])) !== null) {
      calls[i] = match[1];
    }

    if (!calls[i].includes('node:') ||
      calls[i].includes('node:internal/test_runner/runner')) {
      // found API call, truncate by this call frame
      found = true;
      break;
    }

    if (calls[i].includes('node:internal/console/constructor')) {
      // ignore console.log/console.warn/etc.
      return null;
    }
  }

  if (found && i === 0) {
    // sink is called from non-node module
    return null;
  }

  //return calls.slice(0, i).join("\\n");
  return `${calls[0]}\\n${calls[i - 1]}`;
}

function analyzeLineForSarif(line, sinkName, testFilePath, logFilePath, context) {
  let type = IRRELEVANT;

  // we ignore any sources/sinks before START message
  // this message parsing sets context.pollutedProperty
  if (context.pollutedProperty) {
    if ((taintedMatches = taintedRegex.exec(line)) !== null) {
      const func = taintedMatches[1].trim();
      const arg = `${taintedMatches[2]}`;
      if (func === sinkName) {
        type = SINK_TRACE;
      }
    }

    if (line.includes('EVAL!!!') && sinkName === "EVAL") {
      type = SINK_TRACE;
    } else if (line.includes("source stack")) {
      type = SOURCE_TRACE;
    }
  }

  if (type === SOURCE_TRACE) {
    const logLine = line.replace("[From JS]", "").trim();

    // extract error message
    let trace = logLine.substring(logLine.indexOf(":"), /* end */);
    // remove first line of trace (error info)
    trace = trace.substring(trace.indexOf("\\n") + 2, /* end */);
    // remove second line of trace (always line 2 of the test file)
    trace = trace.substring(trace.indexOf("\\n") + 2, /* end */);
    const firstCall = trace.split("\\n")[0];

    function isIgnoredCall(call) {
      return call.includes("nodejs-taint/test") ||
        call.includes("nodejs-taint/tools") ||
        call.includes("node:internal/bootstrap/realm:530") ||
        call.includes("node:internal/test_runner/test");
    }

    let pollutedValueId;
    if ((pollutedMatches = /EFFACED(\d+)/i.exec(logLine)) !== null) {
      pollutedValueId = pollutedMatches[1];
      if (isIgnoredCall(firstCall)) {
        context.ignoreSourceIds.add(pollutedValueId);
        return;
      }
    } else {
      if (isIgnoredCall(firstCall))
        return;

      console.log('[warn] unknown source id: ' + logLine);
      pollutedValueId = "unknown";
    }

    const sources = context.sources.get(pollutedValueId);
    if (sources) {
      sources.push(trace);
    } else {
      context.sources.set(pollutedValueId, [trace]);
    }
  } else if (type === SINK_TRACE) {
    const logLine = line.replace("[From JS]", "").trim();
    const sepTraceIndex = logLine.indexOf("| sink stack:");
    if (sepTraceIndex < 0 && sinkName !== 'EVAL') {
      return;
    }

    let message = logLine;
    let trace = '';
    if (sinkName !== 'EVAL') {
      message = logLine.substring(0, sepTraceIndex);
      trace = logLine.substring(sepTraceIndex, /* end */);
      // remove first line of trace (error info)
      trace = trace.substring(trace.indexOf("\\n") + 2, /* end */);
      // remove second line of trace (always node:internal/bootstrap/realm:547:17)
      trace = trace.substring(trace.indexOf("\\n") + 2, /* end */);
      // remove third line of trace (always node:internal/bootstrap/realm:392:40)
      trace = trace.substring(trace.indexOf("\\n") + 2, /* end */);
    }

    const sepIndex = message.indexOf(":");
    const messagePart = sepIndex > -1
      ? message.substring(sepIndex + 2, /* end */)
      : message;

    let pollutedValueId;
    if ((pollutedMatches = /EFFACED(\d+)/i.exec(messagePart)) !== null) {
      pollutedValueId = pollutedMatches[1];
      if (context.ignoreSourceIds.has(pollutedValueId)) {
        // skip it, the source in the test file
        return;
      }
    } else if (messagePart.includes('[Number]') ||
      messagePart.includes('251636973') ||
      messagePart.includes('EVAL!!!')) {
      pollutedValueId = "unknown";
    } else {
      pollutedValueId = "unknown";
    }

    const sourceTraces = pollutedValueId === "unknown"
      ? Array.from(context.sources.values()).flat()
      : context.sources.get(pollutedValueId)?.slice()

    if (!sourceTraces || sourceTraces.length === 0) {
      if (context.ignoreSourceIds.length === 0) {
        // warn only if we don't ignore the sources
        console.log(`[warn] not found source in the file ${logFilePath} for the sink ${messagePart}`)
      }
      return;
    }

    const propertyId = /^[0-9]+$/.test(context.pollutedProperty)
      ? '<number>'
      : context.pollutedProperty;

    function addSink(sinkId, newSink) {
      const sinks = context.sinks.get(sinkId);
      if (sinks) {
        if (sinks.length < 10) {
          sinks.push(newSink);
        }
      } else {
        context.sinks.set(sinkId, [newSink]);
      }
    }

    const traceSinkId = findTraceId(trace);
    if (traceSinkId === null) {
      return;
    }

    context.testPropPairs++;
    if (traceSinkId) {
      const newSink = {
        id: pollutedValueId,
        pollutedProperty: context.pollutedProperty,
        message,
        sinkTrace: trace,
        sourceTraces,
        test: testFilePath,
        log: logFilePath
      };

      const sinkId = `${propertyId};${traceSinkId}`;
      addSink(sinkId, newSink);
    } else {
      console.log(`[warn] not found API call for the sink (skip it): ${trace}`);
      return;
    }
  } else {
    while ((startMatches = startRegex.exec(line)) !== null) {
      context.pollutedProperty = startMatches[2].trim();
      context.tests.push({
        file: startMatches[1].trim(),
        prop: startMatches[2].trim()
      });
    }
  }
}

function summarizeSarif(sinks) {
  let results = []; //, unmatchedCount = 0;
  for (const sinkGroups of sinks.values()) {
    let location = null;
    let sinkPollutedProperty = null;
    let aggregatedMessage = '';
    const stacks = [];

    for (let groupIndex = 0; groupIndex < sinkGroups.length; groupIndex++) {
      if (groupIndex > 9) {
        // truncate by 10 sink stacks for each group
        break;
      }
      const part = sinkGroups[groupIndex];
      const { id, pollutedProperty, message, sinkTrace, sourceTraces, test, log } = part;
      const sinkId = id;
      const logName = log.replace(/^.*[\\/]/, '')
      if (!sinkPollutedProperty) {
        sinkPollutedProperty = ` ${pollutedProperty},`;
      } else if (!sinkPollutedProperty.includes(` ${pollutedProperty},`)) {
        sinkPollutedProperty += ` ${pollutedProperty},`;
      }

      // take only first location because they must be the same by parsing
      if (!location) {
        try {
          location = parseTraceLine(
            // location = the location of file at the top of the (sink's) stack trace
            sinkTrace
              .split("\\n")
              .find(line => line.startsWith("    at") && !line.includes("<anonymous>"))
          );
        } catch (e) {
          console.log("[error] parsing sink trace: " + sinkTrace);
          throw e;
        }
      }

      if (sinkTrace) {
        stacks.push({
          message: {
            text: `Sink (id ${sinkId} in ${logName})`,
          },
          frames: traceToFrames(sinkTrace),
        });
      }

      if (!sourceTraces || sourceTraces.length === 0) {
        console.warn(`[warn] no source trace found for sink value '${sinkId}' in the file ${log}`);
      } else {
        for (let i = sourceTraces.length - 1; i >= 0; i--) {
          if (i < sourceTraces.length - 5) {
            // truncate by 5 sink traces
            break;
          }

          stacks.push({
            message: {
              text: `Source ${i + 1}/${sourceTraces.length} (id ${sinkId} in ${logName})`,
            },
            frames: traceToFrames(sourceTraces[i]),
          })
        }
      }

      aggregatedMessage +=
        `${message}\nTest: ${test}\nLog: ${log}\n\n`
    }

    results.push({
      level: "error",
      ruleId: "binding",
      message: {
        text: `Property:${sinkPollutedProperty.substring(0, sinkPollutedProperty.length - 1)}\n\nValues:\n${aggregatedMessage}`,
      },
      stacks,
      locations: [
        {
          physicalLocation: {
            artifactLocation: {
              uri: location?.file ?? "unknown",
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
  if (!line)
    return undefined;

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
    file: normalizedFile,
    lineNumber: parseInt(lineNumber, 10) + lineAdjustment,
    columnNumber: parseInt(columnNumber, 10)
  };
}

function normalizeFilename(filename) {
  if (filename.includes("<anonymous>"))
    return undefined;

  if (filename.startsWith("[worker eval]"))
    return undefined;

  if (filename.startsWith("index "))
    return undefined;

  let result = filename
    .replace(/^.*\(/, "")
    .replace(/-pp.js$/, ".js")
    .replace(/-pp.mjs$/, ".mjs")

    // resolve internal code paths
    .replace("node:internal/deps/", `${path.resolve(".")}/deps/`)
    .replace("node:", `${path.resolve(".")}/lib/`)

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
        results: results //.filter(uniqueBy(x => x.message.text)),
      },
    ],
  };
}

function saveSarif(filePath, results) {
  const sarif = toSarif(results);
  const json = JSON.stringify(sarif, null, 2);
  fs.writeFileSync(filePath, json);
  console.log(`[result] Collected ${results.length} gadget candidates.`);
}

async function dumpDir(dirPath) {
  // we use dir name as an analyzed sink name
  const sinkName = path.basename(dirPath);
  console.log(`Analyze ${dirPath} (${sinkName})`);

  const parsingContext = {
    sources: new Map(),
    pollutedProperty: null,
    tests: [],
    ignoreSourceIds: new Set(),
    // real output of the line parsing:
    sinks: new Map(),
    testPropPairs: 0
  };

  let logFiles = 0;
  await readTestsFiles(dirPath, async (testsLine) => {
    const parts = testsLine.split(';');
    if (parts.length < 2) {
      console.log(`[error] Analyzing the file ${fileName}\n`, e);
      return;
    }

    parsingContext.sources = new Map();
    parsingContext.pollutedProperty = null;
    parsingContext.tests = [];
    parsingContext.ignoreSourceIds = new Set();
    const testFilePath = parts[0].trim();
    const logFilePath = parts[1].trim();
    logFiles++;
    await readFile(logFilePath, (logLine) => {
      analyzeLineForSarif(logLine,
        sinkName,
        testFilePath,
        logFilePath,
        parsingContext);
    })

    const { tests } = parsingContext;
    if (tests.length > 0) {
      const mismatchTest = tests.find(x => x.file !== testFilePath || x.prop !== tests[0].prop);
      if (mismatchTest) {
        console.log(`[error] test files mismatch: (${testFilePath}, ${tests[0].prop}) !== (${mismatchTest.file}, ${mismatchTest.prop})`);
      }
    }
  })

  const results = summarizeSarif(parsingContext.sinks);
  saveSarif(path.join(dirPath, 'result.sarif'), results);
  const testPropPairs = parsingContext.testPropPairs;
  return { gadgetCandidates: results.length, logFiles, testPropPairs };
}

if (isMainThread) {
  async function main() {
    if (process.argv[3] == '--all') {
      let basePath = process.argv[2];
      if (basePath.trim() === "") {
        let latestIndex = -1, latestName = null;
        for (const entry of fs.readdirSync("./fuzzing", { withFileTypes: true })) {
          if (entry.isDirectory()) {
            if (entry.name === "tmp" || entry.name === "init") {
              continue;
            }

            const currentIndex = parseInt(entry.name.split("-")[0], 10);
            if (currentIndex > latestIndex) {
              latestIndex = currentIndex;
              latestName = entry.name;
            }
          }
        }
        basePath = `./fuzzing/${latestName}/`;
      }

      const summary = {};
      let total = 0;
      let testRuns = 0;
      let sinks = 0;
      const files = fs.readdirSync(basePath, { withFileTypes: true });
      const batchSize = 100;
      const batches = [];
      for (let i = 0; i < files.length; i += batchSize) {
        batches.push(files.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        const promises = batch.map(file => {
          if (file.isDirectory()) {
            const dirPath = path.join(basePath, file.name);
            return new Promise((resolve, reject) => {
              const worker = new Worker(__filename, {
                workerData: { dirPath }
              });
              worker.on('message', ({ gadgetCandidates, logFiles, testPropPairs }) => {
                summary[file.name] = gadgetCandidates;
                total += gadgetCandidates;
                testRuns += logFiles;
                sinks += testPropPairs;
                resolve();
              });
              worker.on('error', reject);
              worker.on('exit', (code) => {
                if (code !== 0)
                  reject(new Error(`Worker stopped with exit code ${code}`));
              });
            });
          }
        });

        await Promise.all(promises);
      }

      let util = 0;
      let types = 0;
      let errors = 0;
      let async_wrap = 0;
      let byteLengthUtf8 = 0;
      let inspector = 0
      let serdes = 0;
      let postMessage = 0;
      let read = 0;
      let totalFiltered = 0;
      const filtered = {};
      for (const sink of Object.keys(summary)) {
        if (sink.startsWith('util.')) {
          util += summary[sink];
        } else if (sink.startsWith('types.')) {
          types += summary[sink];
        } else if (sink.startsWith('errors.')) {
          errors += summary[sink];
        } else if (sink.startsWith('async_wrap.')) {
          async_wrap += summary[sink];
        } else if (sink.startsWith('inspector.')) {
          inspector += summary[sink];
        } else if (sink == 'buffer.byteLengthUtf8') {
          byteLengthUtf8 += summary[sink];
        } else if (sink == 'serdes.Serializer.Serializer.prototype.writeValue') {
          serdes += summary[sink];
        } else if (sink == 'messaging.MessagePort.MessagePort.prototype.postMessage') {
          postMessage += summary[sink];
        } else if (sink == 'fs.read') {
          read += summary[sink];
        } else if (summary[sink] > 0) {
          totalFiltered += summary[sink];
          filtered[sink] = summary[sink];
        }
      }

      console.log("RESULTS (unfiltered):");
      console.log(summary);
      console.log("RESULTS (filtered):");
      console.log(filtered);

      console.log();
      console.log("----------------------------------");
      console.log();

      console.log("RESULTS (numbers):");
      console.log(`         sinks reached (unfiltered)  :  ${sinks}`);
      console.log(`      unique s2s pairs (unfiltered)  :  ${total}`);
      console.log();
      console.log(`               infrastructure sinks  :  ${types + util + async_wrap + errors + inspector + serdes}`);
      console.log(`              buffer.byteLengthUtf8  :  ${byteLengthUtf8}`);
      console.log(`              messaging.postMessage  :  ${postMessage}`);
      console.log(`                  buffer in fs.read  :  ${read}`);
      console.log();
      console.log(`        unique s2s pairs (filtered)  :  ${totalFiltered}`);
    } else {
      const dirPath = process.argv[2];
      await dumpDir(dirPath);
    }
  }

  main();
} else {
  dumpDir(workerData.dirPath).then(count => {
    parentPort.postMessage(count);
  });
}
