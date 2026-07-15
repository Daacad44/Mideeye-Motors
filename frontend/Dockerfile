# ── Mideeye Motors Web (Vite → Nginx) ──
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY . .
# Build-time public config (baked into the bundle)
# Default to same-origin "/api" — nginx proxies it to the backend.
ARG VITE_API_URL=/api
ARG VITE_IMAGEKIT_PUBLIC_KEY
ARG VITE_IMAGEKIT_URL_ENDPOINT
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_IMAGEKIT_PUBLIC_KEY=$VITE_IMAGEKIT_PUBLIC_KEY
ENV VITE_IMAGEKIT_URL_ENDPOINT=$VITE_IMAGEKIT_URL_ENDPOINT
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
