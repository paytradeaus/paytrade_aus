FROM node:20-slim AS base

RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libnss3 \
    libxss1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    curl \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_SKIP_DOWNLOAD=true

WORKDIR /app

COPY package*.json ./
COPY front-end/package*.json ./front-end/
COPY back-end/package*.json ./back-end/

RUN cd front-end && npm ci --legacy-peer-deps
RUN cd back-end && npm ci --legacy-peer-deps

COPY . .

RUN cd front-end && npm run build
RUN cd back-end && rm -rf dist && npm run build

EXPOSE 5000

CMD ["bash", "start-railway.sh"]
