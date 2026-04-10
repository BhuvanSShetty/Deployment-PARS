FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source
COPY . .

# Expose backend port
EXPOSE 5050

# Start server
CMD ["npm", "run", "start"]
