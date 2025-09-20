#!/bin/bash

# Bolt.new Setup Script for Goveling Expo Project
echo "🚀 Setting up Goveling for Bolt.new..."

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if expo CLI is available, install if not
if ! command -v expo &> /dev/null; then
    echo "📱 Installing Expo CLI..."
    npm install -g @expo/cli
fi

# Clear any existing cache
echo "🧹 Clearing cache..."
npx expo install --fix

# Try to start the development server
echo "🌐 Starting development server..."
if command -v expo &> /dev/null; then
    echo "✅ Using global Expo CLI"
    expo start --web --port 8081
else
    echo "✅ Using npx Expo CLI"
    npx expo start --web --port 8081
fi
