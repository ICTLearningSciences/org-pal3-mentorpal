FROM node:8.11.3
ARG NODE_ENV
WORKDIR /usr/src/app

# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
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

# Bundle app source
COPY . .
EXPOSE 80
CMD [ "python3", "src/classifier/test_classifier_metrics.py" ]
