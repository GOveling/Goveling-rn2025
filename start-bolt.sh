#!/bin/bash

# Bolt.new startup script for Goveling React Native Expo project
echo "🚀 Starting Goveling React Native Expo project..."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the development server for web
echo "🌐 Starting Expo development server for web..."
expo start --web --port 19006

# Alternative fallback if expo command fails
if [ $? -ne 0 ]; then
    echo "⚠️ Expo command failed, trying alternative..."
    npx expo start --web --port 19006
fi
