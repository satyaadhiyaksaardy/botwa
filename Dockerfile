# Use the Alpine version of the Node.js 18 image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Puppeteer dependencies and Chromium installation
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    nodejs \
    yarn

# Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

# Set the path where Chromium is installed
ENV CHROMIUM_PATH /usr/bin/chromium-browser

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install npm dependencies
RUN npm install

# Copy the rest of your app's source code from your host to your image filesystem.
COPY . .

# Command to run your app using npm
CMD ["npm", "run", "start"]
