#!/usr/bin/env
# This is the script that runs inside the docker linux environment

echo "running docker_linux_build.sh. Publish? $1"

yarn
./node_modules/.bin/electron-builder --linux -p $1
