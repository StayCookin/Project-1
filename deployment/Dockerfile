<<<<<<< HEAD
# Use Node.js LTS version
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy app source
COPY . .

# Build frontend assets
RUN npm run build

# Add security headers
RUN apk add --no-cache tini
ENTRYPOINT ["/sbin/tini", "--"]

# Set environment variables
ENV NODE_ENV=production

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Expose port
EXPOSE 5000

# Start application
=======
# Use Node.js LTS version
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy app source
COPY . .

# Build frontend assets
RUN npm run build

# Add security headers
RUN apk add --no-cache tini
ENTRYPOINT ["/sbin/tini", "--"]

# Set environment variables
ENV NODE_ENV=production

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Expose port
EXPOSE 5000

# Start application
>>>>>>> c24ff08aad83fc64379c0b79e46151d3783b8082
CMD ["npm", "start"] 