#!/bin/bash

set -eo pipefail

if [[ "$(docker ps -a | grep ghunter4node)" == "" ]]; then
  docker build \
    --file 'Containerfile' \
    --tag 'ghunter4node' \
    .

  docker run -it \
    --detach \
    --workdir '/src' \
    --name 'ghunter4node' \
    'ghunter4node'
fi

if [[ "$(docker ps -a | grep 'ghunter4node' | grep 'Up')" == "" ]]; then
  docker start 'ghunter4node'
fi

docker exec -it \
  'ghunter4node' \
  bash
