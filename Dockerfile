# FROM ubuntu:xenial
FROM node:8.11.3
ENV NODE_ENV=production

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY website_version/package*.json ./

RUN apt-get update
RUN apt-get install -y apt-transport-https
RUN apt-get install -y build-essential
RUN apt-get install -y npm

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
RUN python3 -m pip install numpy pandas keras tensorflow sklearn nltk gensim
RUN python3 -m nltk.downloader averaged_perceptron_tagger

# Get key
# RUN apt-get update
# RUN apt-get install software-properties-common
# RUN add-apt-repository "deb http://archive.ubuntu.com $(lsb_release -sc) universe"
# RUN add-apt-repository ppa:certbot/certbot
# RUN apt-get update


# Bundle app source
COPY . .

EXPOSE 80
WORKDIR /usr/src/app/website_version
RUN npm install
CMD ["npm","run","start"]

# RUN apt-get install -y python3.5
# RUN apt-get install -y python3-pip
# RUN pip3 install numpy pandas keras tensorflow sklearn nltk
# RUN pip3 install gensim
#
# RUN python3 -m nltk.downloader averaged_perceptron_tagger
#
# # If you are building your code for production
# # RUN npm install --only=production
#
#
# # Bundle app source
# COPY . .
#
# EXPOSE 80
# WORKDIR /usr/src/app/website_version
# RUN npm install
# CMD ["nodejs","app"]
