#!/bin/bash

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo "Error: .env.local file not found. Please create it with your Supabase credentials."
  exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Start the development server
echo "Starting development server..."
npm run dev 