#!/bin/bash

cd ./node

workers=$GHUNTER_WORKERS
timeout=$GHUNTER_TIMEOUT

# Start time
start=$(date +%s)

# Organize state folders
mv fuzzing/init-analyzed/* fuzzing/init/logs_1/
rm -rf fuzzing/init-analyzed

rm -rf fuzzing/tmp
rm -rf fuzzing/output
mkdir fuzzing/tmp
mkdir fuzzing/output

# Run the Python script
./tools/test.py $@ -t $timeout -j $workers --node-args="--no-opt" || true

# Run the Node.js script
node ../src/analyze-crash-output.js

# End time
end=$(date +%s)

# Calculate and report execution time
execution_time=$((end - start))
minutes=$((execution_time / 60))
seconds=$((execution_time % 60))
echo "Total execution time: $minutes mins $seconds secs"
cd ..
