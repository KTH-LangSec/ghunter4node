FROM docker.io/ubuntu:22.04


## Setup environment
RUN apt-get update --fix-missing

# Install general prerequisites
RUN apt-get install -y \
    bash curl git gnupg lsb-release software-properties-common wget \
    cmake g++ ninja-build

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | sh \
    && apt-get install nodejs -y

## Setup ghunter4node
WORKDIR /src
COPY ./.git ./.git
COPY ./node ./node
COPY ./.gitmodules ./
RUN git submodule update --init --recursive
COPY . ./


ENTRYPOINT ["/bin/bash"]
