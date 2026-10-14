# The starter web app behind nginx on :8080. Settings come from the container's
# environment at start (docker/config.sh), not the build: GATEWAY_URL, AUTH_ISSUER,
# AUTH_CLIENT_ID, AUTH_REDIRECT_URI, AUTH_AUDIENCE, AUTH_USER_ID_CLAIM. Unset ones
# fall back to the local defaults `plat5 start` uses.
FROM --platform=$BUILDPLATFORM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM nginx:1-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/headers.conf /etc/nginx/snippets/headers.conf
COPY --chmod=755 docker/config.sh /docker-entrypoint.d/40-config.sh
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
