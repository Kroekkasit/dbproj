#!/bin/bash

echo "🚀 Starting Parcel Delivery Platform Database..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Start containers
echo "📦 Starting MySQL and phpMyAdmin containers..."
docker-compose up -d

# Wait for MySQL to be ready
echo "⏳ Waiting for MySQL to be ready..."
sleep 10

# Check if containers are running
if docker-compose ps | grep -q "Up"; then
    echo ""
    echo "✅ Database containers are running!"
    echo ""
    echo "📊 Access phpMyAdmin at: http://localhost:8080"
    echo "   Server: mysql"
    echo "   Username: root"
    echo "   Password: rootpassword"
    echo ""
    echo "🔌 MySQL connection details:"
    echo "   Host: localhost"
    echo "   Port: 3306"
    echo "   Database: parcel_delivery"
    echo "   Username: root"
    echo "   Password: rootpassword"
    echo ""
    echo "📝 To view logs: docker-compose logs -f"
    echo "🛑 To stop: docker-compose down"
else
    echo "❌ Failed to start containers. Check logs with: docker-compose logs"
    exit 1
fi

