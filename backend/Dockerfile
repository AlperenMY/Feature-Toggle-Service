FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl ca-certificates

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --include=dev; else npm i; fi

COPY prisma ./prisma
COPY tsconfig.json ./tsconfig.json
COPY src ./src

RUN npm run prisma:generate
RUN npm run build

EXPOSE 8080
CMD ["npm","run","start"]
