FROM node:20-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./frontend/
WORKDIR /app/frontend
RUN npm ci
COPY frontend ./ 
RUN npm run build

FROM caddy:2-alpine
COPY --from=build /app/frontend/dist /srv
COPY ops/docker/web/Caddyfile /etc/caddy/Caddyfile

