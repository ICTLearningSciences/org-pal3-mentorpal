FROM continuumio/miniconda3

ARG CONDA_ENV=mentorpal

RUN conda create --name=${CONDA_ENV} python=3.6

RUN echo "source activate ${CONDA_ENV}" > ~/.bashrc
ENV PATH /opt/conda/envs/${CONDA_ENV}/bin:$PATH

ADD requirements.txt /tmp/requirements.txt
RUN bash -c "source activate ${CONDA_ENV} && \
    pip install -r /tmp/requirements.txt"
RUN rm /tmp/requirements.txt

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

