FROM node:12.3.1
ARG NODE_ENV

WORKDIR /app
COPY . .

RUN apt update && \
    apt-get install -y \
        libgif-dev \
        libglu1 \
        libjpeg-dev \
        libpng-dev \
        libtiff-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /tmp
COPY build/client/MentorPanel /tmp/client
# RUN cd /tmp/client && \
#     npm install && \
#     npm run build && \
#     rm -rf /app/build && \
#     cp -r build /app/mentorpanel && \
#     rm -rf /tmp/client
RUN cd /tmp/client && \
    npm install && \
    npm install -g node-gyp && \
    npm run build && \
    npm uninstall -g node-gyp && \
    mkdir -p /app && \
    mv /tmp/client/public /app/public/mentorpanel && \
    rm -rf /tmp/client


WORKDIR /app

RUN rm -rf build

RUN npm install

RUN chmod +x /app/entrypoint.sh

# We need to run our api through a proper unix init service, using tini
ENV TINI_VERSION=v0.16.1
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
RUN chmod +x /tini 
ENTRYPOINT ["/tini", "--", "/app/entrypoint.sh"]