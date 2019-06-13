FROM node:12.4 as builder
ARG NODE_ENV
RUN apt-get update && \
    apt-get install -y \
        libgif-dev \
        libglu1 \
        libjpeg-dev \
        libpng-dev \
        libtiff-dev && \
    rm -rf /var/lib/apt/lists/*
RUN npm install -g gatsby-cli
WORKDIR /
COPY . .
RUN cd /build/client/MentorPanel && \
    npm install && \
    npm run build

FROM node:12.4-slim
ENV TINI_VERSION=v0.16.1
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
RUN chmod +x /tini 
WORKDIR /app
COPY . .
RUN rm -rf build
COPY --from=builder /build/client/MentorPanel/public /app/public/mentorpanel
RUN npm install
RUN chmod +x /app/entrypoint.sh
ENTRYPOINT ["/tini", "--", "/app/entrypoint.sh"]