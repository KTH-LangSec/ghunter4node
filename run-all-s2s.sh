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


# Setup Node.js for source-to-sink-analysis
./setup.sh s2s

# Perform the analysis
./analyze-s2s.sh
