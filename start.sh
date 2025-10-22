#!/bin/bash

# Simple startup script for Docusaurus development server
# Usage: ./start.sh [port]

PORT=${1:-3000}

echo "Starting Docusaurus development server..."
echo "Port: $PORT"
echo "Access: http://localhost:$PORT"
echo ""

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    echo ""
fi

# Start development server
npm run start -- --port $PORT
