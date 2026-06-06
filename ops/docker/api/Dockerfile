FROM node:20-alpine AS deps
WORKDIR /app
COPY api/package*.json ./api/
WORKDIR /app/api
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/api/node_modules ./api/node_modules
COPY api ./api
WORKDIR /app/api
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app/api
ENV NODE_ENV=production
COPY --from=build /app/api/dist ./dist
COPY --from=build /app/api/package*.json ./
COPY --from=build /app/api/prisma ./prisma
COPY --from=build /app/api/node_modules ./node_modules
EXPOSE 3000
CMD ["sh","-lc","npx prisma migrate deploy && node dist/index.js"]

