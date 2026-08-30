FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm install
COPY . .
ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0
RUN npm run build
EXPOSE 8080
CMD ["npx", "next", "start", "--hostname", "0.0.0.0", "--port", "8080"]
