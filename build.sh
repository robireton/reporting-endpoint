#!/usr/bin/env bash
NAME=`jq -r .name package.json | cut -d/ -f2`
VERSION=`jq -r .version package.json`
docker build --tag $NAME:$VERSION --tag $NAME:latest .
