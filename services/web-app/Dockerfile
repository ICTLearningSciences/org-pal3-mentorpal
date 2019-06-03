FROM node:12.3.1 as builder
ARG NODE_ENV
WORKDIR /
COPY . .
RUN apt update && \
    apt-get install -y \
        libgif-dev \
        libglu1 \
        libjpeg-dev \
        libpng-dev \
        libtiff-dev && \
    rm -rf /var/lib/apt/lists/*
RUN cd /build/client/MentorPanel && \
    npm install && \
    npm install -g node-gyp && \
    npm run build


FROM node:12.3.1
ARG NODE_ENV
WORKDIR /app
COPY . .
RUN rm -rf build
COPY --from=builder /build/client/MentorPanel/public /app/public/mentorpanel
RUN npm install
RUN chmod +x /app/entrypoint.sh
# We need to run our api through a proper unix init service, using tini
ENV TINI_VERSION=v0.16.1
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
RUN chmod +x /tini 
ENTRYPOINT ["/tini", "--", "/app/entrypoint.sh"]