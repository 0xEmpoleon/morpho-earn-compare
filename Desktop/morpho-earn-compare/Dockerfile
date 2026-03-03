FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN rm -f package-lock.json && npm install --legacy-peer-deps
COPY . .
CMD ["npm", "run", "dev"]
