const fs = require('fs')
var path = require("path");

// copy `wrap` function to realm.js
function fixRealmJS() {
  let loadersPath = './node/lib/internal/bootstrap/realm.js'
  if (fs.readFileSync(path.resolve(__dirname, "..", ".build"), { encoding: "utf-8" }).trim() === "ss16") {
    loadersPath = './node/lib/internal/bootstrap/loaders.js'
  }
  const wrapPath = './src/wrapper.js'

  let skip = false;
  const wrapContent = fs.readFileSync(wrapPath, 'utf-8')
    .split(/\r?\n/)
    .filter((line) => {
      if (!skip && line.includes('%PLACEHOLDER% SKIP')) {
        skip = true;
        return false;
      }

      if (skip && line.includes('%PLACEHOLDER% END')) {
        skip = false;
        return false;
      }

      return !skip;
    });

  const loadersContent = fs.readFileSync(loadersPath, 'utf-8')
    .split(/\r?\n/);

  const loadersStream = fs.createWriteStream(loadersPath, 'utf8');
  skip = false;
  let indent = '';
  loadersContent.forEach((line, index) => {
    if (!skip && line.includes('%PLACEHOLDER% WRAP')) {
      skip = true;
      indent = line.substring(0, line.indexOf('/'));
      loadersStream.write(line + '\n');
      wrapContent.forEach((wrapLine) => {
        loadersStream.write(indent + wrapLine + '\n');
      })

      return;
    }

    if (skip && line.includes('%PLACEHOLDER% END')) {
      skip = false;
      if (index < loadersContent.length - 1)
        loadersStream.write(line + '\n');
      else
        loadersStream.write(line);
      return;
    }

    if (!skip) {
      if (index < loadersContent.length - 1)
        loadersStream.write(line + '\n');
      else
        loadersStream.write(line);
    }
  });

  loadersStream.end();
}

// hardcode the folder name for taint.log files in ostreams.cc
function fixOstreamsCC() {
  const placeholder = "%PLACEHOLDER% LOGPATH";
  const filePath = './node/deps/v8/src/utils/ostreams.cc';
  let logDirPath = path.resolve('./node/fuzzing/tmp/'); // the replaced path must be full/absolute!
  if (logDirPath[logDirPath.length - 1] != '/') {
    logDirPath += '/';
  }

  const content = fs.readFileSync(filePath, 'utf-8')
    .split(/\r?\n/);

  const stream = fs.createWriteStream(filePath, 'utf8');
  content.forEach((line, index) => {
    const placeholderIndex = line.indexOf(placeholder);
    if (placeholderIndex > -1) {
      const afterPlaceholder = line.substring(placeholderIndex + placeholder.length);
      const firstQuoteIndex = afterPlaceholder.indexOf('"');
      if (firstQuoteIndex > -1) {
        const endQuoteIndex = afterPlaceholder.indexOf('"', firstQuoteIndex + 1);
        if (endQuoteIndex > -1) {
          const beforeValue = line.substring(0, placeholderIndex + placeholder.length + firstQuoteIndex + 1);
          const afterValue = afterPlaceholder.substring(endQuoteIndex);
          stream.write(beforeValue + logDirPath + afterValue + '\n');
        }
      }
    } else {
      if (index < content.length - 1)
        stream.write(line + '\n');
      else
        stream.write(line);
    }
  });

  stream.end();
}

fixRealmJS();
fixOstreamsCC();
