#!/bin/bash

mkdir -p node/fuzzing/tmp
mkdir -p node/fuzzing/init

target="$1"
if [[ "$target" == 's2s' ]]; then
  if [[ "$(cat .build)" != 's2s' ]]; then
    cd node

    # Checkout correct Node.js version
    git reset --hard
    git checkout 38d0e69347de4db532a3bb6bddf51ead9ff764f8 # v21.0.0

    # Clean
    make distclean

    # Apply GHunter changes
    git reset --hard
    git apply ../patches/nodejs-s2s.patch

    # Configure the build tool (see: https://github.com/nodejs/node/blob/main/doc/contributing/building-node-with-ninja.md)
    ./configure --ninja

    cd ..

    echo 's2s' >.build
  fi
elif [[ "$target" == 'crashes' ]]; then
  if [[ "$(cat .build)" != 'crashes' ]]; then
    cd node

    # Checkout correct Node.js version
    git reset --hard
    git checkout 38d0e69347de4db532a3bb6bddf51ead9ff764f8 # v21.0.0

    # Clean
    make distclean

    # Apply GHunter changes
    git reset --hard
    git apply ../patches/nodejs-crashes.patch

    # Configure the build tool (see: https://github.com/nodejs/node/blob/main/doc/contributing/building-node-with-ninja.md)
    ./configure --ninja

    cd ..

    echo 'crashes' >.build
  fi
elif [[ "$target" == 'ss16' ]]; then
  if [[ "$(cat .build)" != 'ss16' ]]; then
    ln -sf /usr/bin/python3 /usr/bin/python

    cd node

    # Checkout correct Node.js version
    git reset --hard
    git checkout 6f740106bde6d8fff11f8ae790b93fedb8cf046b # v16.13.1

    # Clean
    make distclean

    # Apply GHunter changes
    git reset --hard
    git apply ../patches/nodejs-ss16.patch

    # Configure the build tool (see: https://github.com/nodejs/node/blob/main/doc/contributing/building-node-with-ninja.md)
    ./configure --ninja

    cd ..

    echo 'ss16' >.build
  fi
else
  echo "Unknown target '$target' (must be 's2s' or 'crashes' or 'ss16')"
  exit 1
fi

# Target-independent patches
node ./src/patch-nodejs.js
if [ $? -ne 0 ]; then
  echo "Node.js patch failed"
  exit 1
fi

# Build
cd node
ninja -C out/Release
cd ..
