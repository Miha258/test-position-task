FROM node:18-alpine AS builder

WORKDIR /app

COPY ../position-service/package*.json ./
COPY ../position-service/tsconfig.json ./
COPY ../prisma/schema.prisma ./prisma/schema.prisma

RUN npm install
RUN npx prisma generate


COPY ../position-service/. ./
COPY ../client ./prisma/client

ENV NODE_ENV=production

CMD ["npm", "start"]
