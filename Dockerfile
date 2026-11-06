# Multi-stage production build for Crowd Monitor React 19 Frontend
# ----------------------------------------------------------------------------
# Stage 1: Build React SPA
# ----------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency definitions and install
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts || npm install

# Copy source code and build
COPY . .
RUN npm run build

# ----------------------------------------------------------------------------
# Stage 2: Production Nginx Server
# ----------------------------------------------------------------------------
FROM nginx:alpine

# Remove default Nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy built frontend from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom reverse proxy Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
