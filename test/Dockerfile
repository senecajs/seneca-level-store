############################################################
# Dockerfile to build seneca-levelstore test container
# Based on Node image
############################################################

FROM malex/node

MAINTAINER Mircea Alexandru <mircea.alexandru@gmail.com>

ENV DEBIAN_FRONTEND noninteractive

#############################################
##  Clone store
#############################################

WORKDIR /root/.ssh
RUN echo "Host github.com\n\tStrictHostKeyChecking no\n" >> /root/.ssh/config
WORKDIR /opt/app
RUN git clone https://github.com/senecajs/seneca-level-store.git
WORKDIR /opt/app/seneca-level-store

#############################################
# Install dependencies
#############################################
WORKDIR /opt/app/seneca-level-store
RUN npm install

ENTRYPOINT npm run test