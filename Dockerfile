FROM ubuntu:xenial
# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY website_version/package*.json ./
RUN apt-get update
RUN apt-get install -y apt-transport-https 
RUN apt-get install -y nodejs
RUN apt-get install -y build-essential
RUN apt-get install -y npm
RUN apt-get install -y python3.5
RUN apt-get install -y python3-pip
RUN pip3 install numpy pandas keras tensorflow sklearn nltk
RUN pip3 install gensim

RUN python3 -m nltk.downloader averaged_perceptron_tagger

# If you are building your code for production
# RUN npm install --only=production


# Bundle app source
COPY . .

EXPOSE 80
WORKDIR /usr/src/app/website_version
RUN npm install
CMD ["nodejs","app"]
