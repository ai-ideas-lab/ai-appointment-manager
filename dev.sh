#!/bin/bash

# AI Appointment Manager Development Runner
# This script sets up the development environment and runs the application

echo "🚀 Starting AI Appointment Manager Development Environment"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
fi

# Check if environment file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cp .env.example .env
    echo "📝 Please update .env file with your configuration"
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npm run db:generate

# Run database migrations if they exist
if [ -f "prisma/migrations" ]; then
    echo "🗃️  Running database migrations..."
    npm run db:migrate
fi

# Start development server
echo "🌟 Starting development server..."
echo "📊 Health check: http://localhost:3001/health"
echo "🔗 API Documentation: http://localhost:3001/api"
echo "Press Ctrl+C to stop the server"

npm run dev