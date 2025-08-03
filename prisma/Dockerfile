FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install
RUN apt-get update && apt-get install -y postgresql-client

COPY . .

CMD ["sh", "prisma.sh"]