FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Start Vite with host binding for Docker forwarding
CMD ["npm", "run", "dev", "--", "--host"]
