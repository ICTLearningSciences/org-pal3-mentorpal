FROM node:8.11.3
ARG NODE_ENV

WORKDIR /app

COPY . .

RUN npm install

RUN chmod +x /app/entrypoint.sh

# We need to run our api through a proper unix init service, using tini
ENV TINI_VERSION=v0.16.1
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
RUN chmod +x /tini 
ENTRYPOINT ["/tini", "--", "/app/entrypoint.sh"]