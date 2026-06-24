FROM oven/bun:1 AS build

WORKDIR /app

COPY Backend/package.json Backend/bun.lock ./
RUN bun install --frozen-lockfile

COPY Backend/src ./src
COPY Backend/tsconfig.json ./

RUN bun run build

FROM oven/bun:1-alpine

WORKDIR /app

COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./

RUN bun install --frozen-lockfile --production

EXPOSE 3000

CMD ["bun", "run", "dist/index.js"]