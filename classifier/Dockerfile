FROM continuumio/miniconda3

# About installed packages:
#       - build-essential 
#               Even if this is a runtime image, theano seems to require g++ etc. to run
RUN apt-get update && apt-get install -y \
        build-essential && \
        rm -rf /var/lib/apt/lists/*

ARG CONDA_ENV=mentorpal

ADD environment.yml /tmp/environment.yml
RUN conda env create -f /tmp/environment.yml

# Pull the environment name out of the environment.yml
RUN echo "source activate $(head -1 /tmp/environment.yml | cut -d' ' -f2)" > ~/.bashrc
ENV PATH /opt/conda/envs/$(head -1 /tmp/environment.yml | cut -d' ' -f2)/bin:$PATH
RUN rm /tmp/environment.yml

RUN bash -c "source activate ${CONDA_ENV} && \
    python -m nltk.downloader averaged_perceptron_tagger"

WORKDIR /app
COPY build/src .
COPY build/mentors mentors

# TODO: download GoogleNews-vectors... in a distinct docker stage
# so that we can install the 'gdown' tool only there and leave it behind

# Install GoogleNews-vectors-negative300-SLIM.bin to vector_models
#
# We use the python gdown script because Google Drive
# doesn't seem to provide direct download links for large files;
# the download url always redirects to a confirm page.
RUN mkdir vector_models && \
    cd vector_models && \
    bash -c "source activate ${CONDA_ENV} && \
        pip install gdown && \ 
        gdown https://drive.google.com/uc?id=0B3dYuDrHnGaYLWtqcTVBQVZCejQ"

