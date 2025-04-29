FROM node:18-alpine

WORKDIR /app

# Install required build dependencies and curl for healthcheck
RUN apk add --no-cache python3 make g++ curl

# Copy package files
COPY package*.json ./
COPY knexfile.js ./

# Install dependencies
RUN npm install

# Copy source code and migrations
COPY src/ src/
COPY migrations/ migrations/

EXPOSE 3000

# Start application (migrations will run automatically on startup)
CMD ["npm", "start"]
