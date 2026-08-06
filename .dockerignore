FROM node:22-alpine

WORKDIR /app

# Install dependencies first (better layer caching)
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copy the rest of the backend app
COPY backend/. .

EXPOSE 80

CMD ["node", "server.js"]