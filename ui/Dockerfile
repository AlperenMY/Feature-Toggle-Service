FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci || npm i

COPY next.config.js ./
COPY src ./src

RUN npm run build

EXPOSE 3000
CMD ["npm","run","start"]
