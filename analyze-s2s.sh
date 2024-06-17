#!/bin/bash

cd node

workers=$GHUNTER_WORKERS
timeout=$GHUNTER_TIMEOUT

# Start time
start=$(date +%s)

if ! test -f ../.wip; then

# Check if the directory fuzzing/tmp and fuzzing/init exists
if [ -d "fuzzing/tmp" ]; then
    # Directory exists, remove all nested files
    rm -rf fuzzing/tmp
fi

# Create the dir tmp
mkdir -p fuzzing/tmp

if [ -d "fuzzing/init" ]; then
    # Directory exists, remove it
    rm -rf fuzzing/init
fi

# Run the Python script
./tools/test.py $@ -t $timeout -j $workers --node-args="--no-opt"

# Rename fuzzing/tmp to fuzzing/init and create a new fuzzing/tmp
mv fuzzing/tmp fuzzing/init
mkdir fuzzing/tmp

# ############################################################################ #

touch ../.wip

# Run the Python script again
./tools/test.py $@ -t $timeout -j $workers --node-args="--no-opt" || true

fi

rm -f ../.wip

# ############################################################################ #

# Run the Node.js script
node ../src/analyze-taint-logs.js
node ../src/analyze-taint-logs-step2-to-sarif.js '' --all
node ../src/analyze-init-logs-to-count-unique-prop-names.js ./fuzzing/init-analyzed/

# End time
end=$(date +%s)

# Calculate and report execution time
execution_time=$((end - start))
minutes=$((execution_time / 60))
seconds=$((execution_time % 60))
echo "Total execution time: $minutes mins $seconds secs"
cd ..
