# Gadget Hunter (GHunter) for the Node.js runtime

This artifact contains the part of tool and experiments from the paper "GHunter: Universal Prototype Pollution Gadgets in JavaScript Runtimes" for the Node.js analysis.

## Artifact

The artifact implements dynamic analysis for detecting prototype pollution in the Node.js JavaScript runtime.
The analysis modifies the Node.js runtime (the files in `patches/` represent all modifications) and runs the Node.js test suite.
You can run the analysis by following the instructions below.

## Requirements

### Hardware

We conducted the original experiments on an AMD EPYC 7742 64-Core 2.25 GHz server with 512 GB RAM, and 1 TB of disk space.
We have also run the experiments partially (see below) on an AMD Ryzen 7 3700x 8-core CPU (3.60GHz), 32 GB RAM, and 50 GB of disk space.
No specific hardware features are required.

### Software

We originally ran the experiments on Ubuntu 22.04.
We used [Docker] as an OCI container runtime.

[docker]: https://www.docker.com/

## Setup

We provide two modes for experiment evaluation:

1. A container image with a prepared environment.
2. Instructions on how to set up the environment on own machine.

### Container

To run the experiments in a prepared environment you can use the container image defined for this project. You can either use a prebuild image or build the image from scratch.

#### Prebuild

To use the prebuild container image, pull the image `ghcr.io/kth-langsec/ghunter4node`, launch the container, and attach a bash shell to the container to get started.

```shell
docker pull ghcr.io/kth-langsec/ghunter4node:latest
docker run -dit --name ghunter4node ghcr.io/kth-langsec/ghunter4node:latest
docker exec -it ghunter4node /bin/bash
```

#### Build

To build the container image from scratch you can clone the repository and run the helper script `container.sh`. This will build the image, start a container, and attach to it automatically.

```shell
git clone git@github.com:KTH-LangSec/ghunter4node.git
cd ghunter4node
./container.sh
```

### Local Installation

To run the experiments locally, clone the repository with submodules recursively:

```shell
git clone --recurse-submodules git@github.com:KTH-LangSec/ghunter4node.git
```

and set up the [Node.js development prerequisites].

[node.js development prerequisites]: ./node/BUILDING.md#building-nodejs-on-supported-platforms

## Basic Test

As a basic test we provide a way to run the source-to-sink analysis on a single test.
To perform this basic test run `./run-basic_test.sh`.
This requires compiling Node.js, which can take up to hour.
The analysis itself is expected to take about a minute.

This will produce a directory named `node/fuzzing/X-YYYY-MM-DD-HH-MM-SS` containing subdirectories for each detected sink with one SARIF file each.
This analysis is expected to yield about 10 unique s2s pairs after filtering.

## Experiments

We provide two experiment modes, partial and full.
The motivation for this is that a full analysis of Node.js requires advanced hardware (see hardware requirements) and significant compute time.
We recommend a partial experiment to assess the tool.

### Partial

As a partial experiment we recommend analyzing Node.js' `child_process` API.
This can be done by running two separate scripts, one for the source-to-sink analysis and one for the unexpected-termination analysis.

To run the source-to-sink analysis run `./run-child_process-s2s.sh`, optionally with a number of workers (default 5) and test timeout (default 20s).
This is expected to take at most 4 hours.

This script may show a shell prompt before finishing, make sure the script has outputted "All tests passed" before continuing.
The script may get stuck after printing "All tests passed" a second time.
If this happens, press <kbd>Enter</kbd> or <kbd>Ctrl</kbd>+<kbd>C</kbd> and rerun the script (this will continue where it left off).

This will output a summary about the analysis in the end and produce per-sink SARIF files for manual review in a `node/fuzzing/X-YYYY-MM-DD-HH-MM-SS` directory.

To run the unexpected-termination analysis run `./run-child_process-crashes.sh` (after `./run-child_process-s2s.sh`), optionally with a number of workers (default 5) and test timeout (default 20s).
This is expected to take at most 2 hours.

This will output a summary about the analysis in the end and produce per-sink SARIF files for manual review in a `node/fuzzing/X-YYYY-MM-DD-HH-MM-SS` directory.

### Full

Running the full experiment requires advanced hardware, notably a large amount of memory.
Performing the full analysis requires running two separate scripts.
One for the source-to-sink analysis and one for the unexpected-termination analysis.

To run the source-to-sink analysis run `./run-all-s2s.sh`.
On the original hardware this took approximately 72 hours with 64 workers.
This will output numbers about the analysis in the end and produce per-sink SARIF files for manual review in a `node/fuzzing/X-YYYY-MM-DD-HH-MM-SS` directory.

To run the unexpected-termination analysis run `./run-all-crashes.sh` (after `./run-all-s2s.sh`).
On the original hardware this took approximately 24 hours with 64 workers.
This will output numbers about the analysis in the end and produce per-sink SARIF files for manual review in a `node/fuzzing/X-YYYY-MM-DD-HH-MM-SS` directory.

### Comparison to Silent Spring

The experiments for a comparison to Silent Spring can be run as follows.
No additional setup is required to run these experiments.
These experiments can be run on the more modest hardware described above.

#### On Node.js v21.0.0

To run the experiments for the comparison on Node.js v21.0.0 run `./run-compare-ss-21.sh`.
This requires compiling Node.js, which can take up to hour.
The analysis itself is expected to take about a minute.

This will produce 9 folders following the naming scheme `X-YYYY-MM-DD-HH-MM-SS` in `node/fuzzing.ss21/`.
The `X` in the folder name maps to Table 3 of the paper according to the mapping below.
Each folder will contain per-sink SARIF files as well as a file named `compare.json` and `count.txt`.
The `count.txt` file contains the number presented as "GC" in Table 3.
`compare.json` contains more detailed information about the detected sinks, including true and false positives. Verifying these is a manual process.

| Folder index | API from Table 3     |
| ------------ | -------------------- |
| 1            | `cp.exec`            |
| 2            | `cp.execFile`        |
| 3            | `cp.execFileSync`    |
| 4            | `cp.execSync`        |
| 5            | `cp.fork`            |
| 6            | `cp.spawn`           |
| 7            | `cp.spawnSync`       |
| 8            | `import`             |
| 9            | `vm.compileFunction` |

#### On Node.js v16.13.1

To run the experiments for the comparison on Node.js v16.13.1 run `./run-compare-ss-16.sh`.
This requires compiling Node.js, which can take up to hour.
The analysis itself is expected to take about a minute.

This will produce 11 folders following the naming scheme `X-YYYY-MM-DD-HH-MM-SS` in `node/fuzzing.ss16/`.
The `X` in the folder name maps to Table 2 of the paper according to the mapping below.
Each folder will contain per-sink SARIF files as well as a file named `compare.json` and `count.txt`.
The `count.txt` file contains the number presented as "GC" in Table 2.
`compare.json` contains more detailed information about the detected sinks, including true and false positives. Verifying these is a manual process.

| Folder index | API from Table 2     |
| ------------ | -------------------- |
| 1            | `cp.exec`            |
| 2            | `cp.execFile`        |
| 3            | `cp.execFileSync`    |
| 4            | `cp.execSync`        |
| 5            | `cp.fork`            |
| 6            | `cp.spawn`           |
| 7            | `cp.spawnSync`       |
| 8            | `import`             |
| 9+10         | `require`            |
| 11           | `vm.compileFunction` |

## Additional content

This repository also contains:

- `results`: A snapshot of results from an earlier run.
- `src`: Various scripts and files to run GHunter on Node.js.
- `tests`: A set of basic tests for GHunter.
