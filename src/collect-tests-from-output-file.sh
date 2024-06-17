#!/bin/bash

FILE="$1"

# Use grep with Perl-compatible regex to match the pattern
grep -oP '\[\d*:\d*\|% +\d*\|\+ +\d*\|- +\d*\]: release (.*?)$' "$FILE" | while read -r line; do
    if [[ $line =~ release\ (.*) ]]; then
        matched_group="${BASH_REMATCH[1]}"

        # Remove trailing '...'
        matched_group=${matched_group%%...}
        echo "$matched_group"
    fi
done

# !!! To generate unique tests, use:
# sort results-final-2.1-all-tests.txt | uniq > results-final-2.1-all-tests-uniq.txt
#
