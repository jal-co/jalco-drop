FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build:node && node -p "require('./package.json').devDependencies['puppeteer-core']" > /app/puppeteer-version

FROM node:22-bookworm-slim
RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium fonts-noto-color-emoji \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app/puppeteer-version ./
RUN npm install --no-save --no-package-lock --ignore-scripts "puppeteer-core@$(cat puppeteer-version)" && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public
ENV NODE_ENV=production PORT=3000 DATA_DIR=/data CHROME_PATH=/usr/bin/chromium
RUN mkdir -p /data && chown node:node /data
VOLUME /data
EXPOSE 3000
USER node
CMD ["node", "dist/server.mjs"]
