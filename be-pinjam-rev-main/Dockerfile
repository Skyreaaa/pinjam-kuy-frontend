# Use official Node.js LTS image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with legacy peer deps to resolve cloudinary version conflict
RUN npm ci --legacy-peer-deps

# Copy application files
COPY . .

# Create uploads directory
RUN mkdir -p uploads/book-covers uploads/fine-proofs uploads/profile

# Expose port (Back4App will override with $PORT)
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["npm", "start"]
