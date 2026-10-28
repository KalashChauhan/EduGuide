FROM node:22-alpine AS build
WORKDIR /app
COPY backend/package*.json ./backend/
RUN npm ci --prefix backend --omit=dev
COPY frontend/package*.json ./frontend/
RUN npm ci --prefix frontend
COPY frontend ./frontend
RUN npm run build --prefix frontend
COPY backend ./backend
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
CMD ["node", "backend/server.js"]
