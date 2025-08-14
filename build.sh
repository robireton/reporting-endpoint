#!/usr/bin/env bash

NAME=$(jq -r .name package.json | cut -d/ -f2)
VERSION=$(jq -r .version package.json)

case "$1" in
  release)
    EXTRA_TAGS=(--tag "$NAME:latest")
    ;;
  dev)
    EXTRA_TAGS=(--tag "$NAME:dev")
    ;;
  *)
    EXTRA_TAGS=()
    ;;
esac

docker build --tag "$NAME:$VERSION" "${EXTRA_TAGS[@]}" .
