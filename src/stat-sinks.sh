#!/bin/bash

# Check if an argument is provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <directory>"
    exit 1
fi

# Directory from the first argument
DIR=$1

# Initialize total count
total=0

# Initialize array to hold output lines
declare -a outputLines

# Find subdirectories and count 'tests.txt' files in their subfolders
while IFS= read -r -d '' subdir; do
    count=$(find "$subdir" -type f -name "tests.txt" | wc -l)
    subdirName=$(basename "$subdir")
    outputLines+=("$subdirName: $count")
    ((total += count))
done < <(find "$DIR" -maxdepth 1 -mindepth 1 -type d -print0)

# Sort and print the output lines
IFS=$'\n' sortedLines=($(sort <<< "${outputLines[*]}"))
unset IFS

for line in "${sortedLines[@]}"; do
    echo "$line"
done

echo "Total: $total"
