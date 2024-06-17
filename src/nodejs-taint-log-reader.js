const fs = require('fs');
const path = require('path');

const logDirectory = path.join(__dirname, '../node/fuzzing/tmp');

function cleanLogs() {
    if (fs.existsSync(logDirectory)) {
        const files = fs.readdirSync(logDirectory);
        for (const file of files) {
            fs.unlinkSync(path.join(logDirectory, file));
        }
    } else {
        fs.mkdirSync(logDirectory, { recursive: true });
    }
}

function readOneLogFile() {
  if (!fs.existsSync(logDirectory)) {
    throw new Error(`Log directory does not exist: ${logDirectory}`);
  }

  const files = fs.readdirSync(logDirectory);
  if (files.length > 1) {
    throw new Error(`More than one log file found in directory: ${logDirectory}`);
  } else if (files.length === 0) {
    throw new Error(`Log directory is empty: ${logDirectory}`);
  }

  const filePath = path.join(logDirectory, files[0]);
  const fileContent = fs.readFileSync(filePath, 'utf8');
  let lines = fileContent.split('\n').map(line => line.trim());
  if (lines.length > 0 && lines[0] === '') {
    lines.shift();
  }

  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }

  return lines;
}

module.exports = {
  cleanLogs,
  readOneLogFile
}
