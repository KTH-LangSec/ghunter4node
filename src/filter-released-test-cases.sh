#!/bin/bash

FILE_ALL_TESTS="/srv/source-code/js-runtime-taint/results-final-2.1-all-tests-uniq.txt"
FILE_RELEASED_TESTS="/srv/source-code/js-runtime-taint/results-final-2.1-all-relesed-tests.txt"

# Read each line from File B and use it to grep in FILE_ALL_TESTS
while IFS= read -r line; do
    grep -F "$line" "$FILE_ALL_TESTS"
done < "$FILE_RELEASED_TESTS"
