#!/bin/bash

./setup.sh ss16

cd ./node

mkdir -p fuzzing/
mv fuzzing/ fuzzing.bkp/

rm -rf fuzzing.ss16/

# Start time
start=$(date +%s)

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

run() {
    local filename=$1
    local postfix=$2

    ./tools/test.py "$filename" -t 20 -j 1
    mv fuzzing/tmp fuzzing/init
    mkdir fuzzing/tmp
    ./tools/test.py "$filename" -t 20 -j 1
    node ../src/analyze-taint-logs.js
    node ../src/analyze-taint-logs-step2-to-sarif.js '' --all
    node ../src/analyze-taint-compare.js
    mv fuzzing/init "fuzzing/init-$postfix"
    mv fuzzing/tmp "fuzzing/tmp-$postfix"
    mkdir fuzzing/tmp
}

cp -r ../src/ss16/* ./test/parallel/
mv ./test/parallel/_node_modules/ ./test/parallel/node_modules/

run parallel/test-ss-child-process-exec.js          cp-exec             # 1
run parallel/test-ss-child-process-execfile.js      cp-execfile         # 2
run parallel/test-ss-child-process-execfilesync.js  cp-execfilesync     # 3
run parallel/test-ss-child-process-execsync.js      cp-execsync         # 4
run parallel/test-ss-child-process-fork.js          cp-fork             # 5
run parallel/test-ss-child-process-spawn.js         cp-spawn            # 6
run parallel/test-ss-child-process-spawnsync.js     cp-spawnsync        # 7
run parallel/test-ss-import-main.js                 import              # 8
run parallel/test-ss-require-exports.js             require-exports     # 9
run parallel/test-ss-require-main.js                require-main        # 10
run parallel/test-ss-vm.js                          vm-compilefunction  # 11

cd ./test/parallel/
rm -rf node_modules/ sample.js test-ss-child-process-execfile.js test-ss-child-process-execfilesync.js test-ss-child-process-exec.js test-ss-child-process-execsync.js test-ss-child-process-fork.js test-ss-child-process-spawn.js test-ss-child-process-spawnsync.js test-ss-import-main.js test-ss-require-exports.js test-ss-require-main.js test-ss-vm.js
cd ../..

mv fuzzing fuzzing.ss16
mv fuzzing.bkp fuzzing

# End time
end=$(date +%s)

# Calculate and report execution time
execution_time=$((end - start))
minutes=$((execution_time / 60))
seconds=$((execution_time % 60))
echo "Total execution time: $minutes mins $seconds secs"
cd ..
