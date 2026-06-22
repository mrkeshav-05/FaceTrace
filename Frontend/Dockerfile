# ---- Development Stage ----
FROM node:20-alpine AS development

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]

# ---- Production Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Build arguments for env vars needed at build time
ARG NEXT_PUBLIC_BACKEND_URL
ARG NEXT_PUBLIC_IMAGE_RECOGNITION_URL

ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_IMAGE_RECOGNITION_URL=$NEXT_PUBLIC_IMAGE_RECOGNITION_URL

RUN npm run build

# ---- Production Runner ----
FROM node:20-alpine AS production

WORKDIR /app

# Copy only the production artifacts
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./next.config.js

EXPOSE 3000

CMD ["npm", "run", "start"]