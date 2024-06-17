#!/bin/bash

set -eo pipefail

workers="$1"
timeout="$2"

if [[ "$workers" == "" ]]; then
  workers="5"
fi

if [[ "$timeout" == "" ]]; then
  timeout="20"
fi

echo "Running with $workers worker(s) and a timeout of $timeout second(s)."
echo 'You can configure this with the first and second argument respectively.'
sleep 3
echo


export GHUNTER_WORKERS=$workers
export GHUNTER_TIMEOUT=$timeout


# Setup Node.js for source-to-sink analysis
./setup.sh s2s

# disable test that requires >32GB of memory
if ! test -f ./.wip; then
mkdir -p ./node/.bkp/
mv ./node/test/sequential/test-child-process-pass-fd.js ./node/.bkp/test-child-process-pass-fd.js
fi

# Perform the analysis
./analyze-s2s.sh child-process

# restore test that requires >32GB of memory
mv ./node/.bkp/test-child-process-pass-fd.js ./node/test/sequential/test-child-process-pass-fd.js
rm -rf ./node/.bkp/
