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

# NEXT_PUBLIC_* vars are inlined into the client bundle at build time, so they
# must be present during `next build` — not just at container runtime. Railway
# injects service variables as build args when they are declared with ARG.
# Keep this list in sync with `rg -o 'NEXT_PUBLIC_[A-Z0-9_]+' front-end/`.
# Every NEXT_PUBLIC_* the frontend reads must be declared here, otherwise
# Next.js inlines an empty string into the client bundle at build time.
ARG NEXT_PUBLIC_DEPLOYED_URL
ENV NEXT_PUBLIC_DEPLOYED_URL=$NEXT_PUBLIC_DEPLOYED_URL
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID
ENV NEXT_PUBLIC_GA_MEASUREMENT_ID=$NEXT_PUBLIC_GA_MEASUREMENT_ID
ARG NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
ENV NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=$NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
ARG NEXT_PUBLIC_GRAPHQL_URI
ENV NEXT_PUBLIC_GRAPHQL_URI=$NEXT_PUBLIC_GRAPHQL_URI
ARG NEXT_PUBLIC_GTM_ID
ENV NEXT_PUBLIC_GTM_ID=$NEXT_PUBLIC_GTM_ID
ARG NEXT_PUBLIC_RECAPTCHA_KEY
ENV NEXT_PUBLIC_RECAPTCHA_KEY=$NEXT_PUBLIC_RECAPTCHA_KEY
ARG NEXT_PUBLIC_SOCKET_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_WEB_SOCKET_BASED_PDF_FILE_DOWNLOAD_TO_GET_URL
ENV NEXT_PUBLIC_WEB_SOCKET_BASED_PDF_FILE_DOWNLOAD_TO_GET_URL=$NEXT_PUBLIC_WEB_SOCKET_BASED_PDF_FILE_DOWNLOAD_TO_GET_URL

RUN cd front-end && npm run build
RUN cd back-end && rm -rf dist && npm run build

EXPOSE 5000

CMD ["bash", "start-railway.sh"]
