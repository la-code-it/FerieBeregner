# Use official Node.js runtime as base image
FROM node:18-alpine

# Set working directory in container
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application files
COPY . .

# Expose port 3000, 80 and 443
EXPOSE 3000
EXPOSE 80
EXPOSE 443

# Set environment variable
ENV PORT=3000

# Start the application
CMD ["node", "server.js"]
