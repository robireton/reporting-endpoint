FROM node:lts-slim
USER node
RUN mkdir /home/node/app
WORKDIR /home/node/app
COPY --chown=node:node package.json .
RUN npm install --omit=dev
COPY --chown=node:node lib lib
CMD [ "npm", "--silent", "start" ]
EXPOSE 80
