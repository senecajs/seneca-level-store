#!/bin/bash

set -e

docker build -t level-store --no-cache -f Dockerfile .

docker run -i  level-store