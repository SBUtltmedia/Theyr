# 1. Use Node.js base image
FROM node:20-slim

# 2. Set working directory
WORKDIR /app

# 3. Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# 4. Copy the rest of the application
COPY . .

# 5. Build the Twine story
RUN npm run build

# 6. Expose the port (Hugging Face Spaces defaults to 7860)
EXPOSE 7860
ENV PORT=7860

# 7. Start the server
# Set NODE_ENV to production to disable the file watcher
ENV NODE_ENV=production
CMD ["npm", "start"]
