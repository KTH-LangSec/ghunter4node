#!/bin/bash

# Get the directory where the script is located and append '/tmp'
FOLDER="$(dirname "$0")/../node/fuzzing/tmp"

# # This will hold the unique file paths
# declare -A unique_file_paths

# Search for the pattern and process each matching line
grep -hRoP '===== START ===== \[(.*?)\]' "$FOLDER" | while read -r line; do
    # Extract the full path using a regular expression
    if [[ $line =~ \[(.*)\] ]]; then
        file_path="${BASH_REMATCH[1]}"
        echo $file_path
        # unique_file_paths["$file_path"]=1
    fi
done

# !!! To generate unique tests, use:
# sort results-final-2.1-all-tests.txt | uniq > results-final-2.1-all-tests-uniq.txt
#

# # Output the unique file paths
# for file in "${!unique_file_paths[@]}"; do
#     echo $file
# done
