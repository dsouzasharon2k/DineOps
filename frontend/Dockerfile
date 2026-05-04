# Build stage
FROM node:20-alpine AS build
WORKDIR /app
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
ARG VITE_BASE_PATH=/
ENV VITE_BASE_PATH=${VITE_BASE_PATH}
ARG VITE_SENTRY_DSN=
ENV VITE_SENTRY_DSN=${VITE_SENTRY_DSN}
ARG VITE_SENTRY_ENVIRONMENT=production
ENV VITE_SENTRY_ENVIRONMENT=${VITE_SENTRY_ENVIRONMENT}
ARG VITE_SENTRY_TRACES_SAMPLE_RATE=0.1
ENV VITE_SENTRY_TRACES_SAMPLE_RATE=${VITE_SENTRY_TRACES_SAMPLE_RATE}
ARG VITE_RELEASE=dineops-frontend
ENV VITE_RELEASE=${VITE_RELEASE}
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Serve stage ────────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine

# Remove default nginx config and default html
RUN rm -f /etc/nginx/conf.d/default.conf && rm -rf /usr/share/nginx/html/*

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Verify nginx config is valid at build time
RUN nginx -t

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
