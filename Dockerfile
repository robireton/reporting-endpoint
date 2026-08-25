FROM node:lts-slim

# Supplied by build.sh so a deployed image can be traced back to a commit.
ARG VERSION=dev
ARG REVISION=unknown
ARG CREATED=

LABEL org.opencontainers.image.title="reporting-endpoint"
LABEL org.opencontainers.image.version="$VERSION"
LABEL org.opencontainers.image.revision="$REVISION"
LABEL org.opencontainers.image.created="$CREATED"
LABEL org.opencontainers.image.authors="Rob Ireton <rob@ireton.org>"
LABEL org.opencontainers.image.description="legacy CSP report-uri endpoint"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.source="https://github.com/robireton/reporting-endpoint.git"

USER node
RUN mkdir /home/node/app
WORKDIR /home/node/app

# Copying only what is needed keeps .envrc and its live API tokens structurally out of
# the image. npm ci needs the lockfile, so both files are copied.
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --chown=node:node lib lib

CMD [ "npm", "--silent", "start" ]
