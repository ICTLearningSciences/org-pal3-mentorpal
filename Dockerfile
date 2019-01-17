# FROM ubuntu:xenial
FROM node:8.11.3
ARG NODE_ENV
WORKDIR /usr/src/app

# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY website_version/package*.json ./

RUN apt-get update && apt-get install -y \
    apt-transport-https \
    build-essential \
    vim && \
  rm -rf /var/lib/apt/lists/*

# Install python
WORKDIR /usr/src
RUN wget https://www.python.org/ftp/python/3.5.5/Python-3.5.5.tgz
RUN tar xzf Python-3.5.5.tgz
WORKDIR /usr/src/Python-3.5.5
RUN ./configure --enable-optimizations && \
  make altinstall
RUN ln -s /usr/local/bin/python3.5 /usr/local/bin/python3

# Install python dependencies
WORKDIR /usr/src/app
RUN python3 -m pip install \
  gdown \
  gensim \
  keras == 2.0.5 \
  nltk \
  numpy \
  pandas \
  sklearn \
  tensorflow 

RUN python3 -m nltk.downloader averaged_perceptron_tagger

# Bundle app source
COPY . .
EXPOSE 80
WORKDIR /usr/src/app/website_version
RUN npm install

# Install GoogleNews-vectors-negative300-SLIM.bin to vector_models
#
# We use the python gdown script because Google Drive
# doesn't seem to provide direct download links for large files;
# the download url always redirects to a confirm page.
RUN cd vector_models && \
  gdown https://drive.google.com/uc?id=0B3dYuDrHnGaYLWtqcTVBQVZCejQ


CMD npm run start
