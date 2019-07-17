FROM node:alpine

EXPOSE 8000

RUN npm install -g gatsby-cli

WORKDIR /app

COPY . .

RUN npm install

RUN chmod +x /app/entrypoint.sh

ENV TINI_VERSION=v0.16.1
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
RUN chmod +x /tini 
ENTRYPOINT ["/tini", "--", "/app/entrypoint.sh"]