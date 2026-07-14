# ── Mideeye Motors Web (Vite → Nginx) ──
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY . .
# Build-time public config (baked into the bundle)
# Default to same-origin "/api" — nginx proxies it to the backend.
ARG VITE_API_URL=/api
ARG VITE_CLOUDINARY_CLOUD_NAME
ARG VITE_LOGO_PUBLIC_ID
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_CLOUDINARY_CLOUD_NAME=$VITE_CLOUDINARY_CLOUD_NAME
ENV VITE_LOGO_PUBLIC_ID=$VITE_LOGO_PUBLIC_ID
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
