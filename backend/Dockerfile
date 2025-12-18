FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Development target
FROM base AS dev
EXPOSE 3010
CMD ["npm", "run", "dev"]

# Production target
FROM base AS prod
RUN npm run build
EXPOSE 3010
CMD ["npm", "start"]
