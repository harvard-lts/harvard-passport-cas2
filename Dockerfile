### Image to run npm commands ###

FROM node:12.16-alpine

# Install bash
RUN apk add --no-cache bash && apk add curl

# Install dependencies
RUN apk add --no-cache file
RUN apk --update add git

# Create working directory
RUN mkdir -p /home/node/app

# Set working directory
WORKDIR /home/node/app

# Copy code
COPY . /home/node/app

RUN npm install