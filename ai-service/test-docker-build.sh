#!/bin/bash

echo "🐳 Testing Docker Build for AI Service"
echo "======================================"

# Build the Docker image
echo "📦 Building Docker image..."
docker build -t test-ai-service -f ai-service/Dockerfile .

if [ $? -eq 0 ]; then
    echo "✅ Docker build successful!"
    
    # Test if the image can run
    echo "🧪 Testing if container can start..."
    docker run --rm -d --name test-container -p 8001:8000 test-ai-service
    
    if [ $? -eq 0 ]; then
        echo "✅ Container started successfully!"
        
        # Wait a moment for startup
        sleep 5
        
        # Test health endpoint
        echo "🏥 Testing health endpoint..."
        curl -f http://localhost:8001/health
        
        if [ $? -eq 0 ]; then
            echo "✅ Health check passed!"
        else
            echo "⚠️  Health check failed, but container is running"
        fi
        
        # Stop the test container
        docker stop test-container
        echo "🛑 Test container stopped"
    else
        echo "❌ Container failed to start"
    fi
    
    # Clean up the test image
    echo "🧹 Cleaning up test image..."
    docker rmi test-ai-service
    
else
    echo "❌ Docker build failed!"
    exit 1
fi

echo "🎉 Docker test completed!" 