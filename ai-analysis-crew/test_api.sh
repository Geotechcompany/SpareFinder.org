#!/bin/bash
# Test script for API endpoints

echo "==================================="
echo "Testing AI Spare Part Analyzer API"
echo "==================================="
echo ""

echo "1. Testing Root Endpoint (GET /)..."
curl -s https://aiagent-sparefinder-org.onrender.com/ | python -m json.tool
echo ""
echo ""

echo "2. Testing Health Endpoint (GET /health)..."
curl -s https://aiagent-sparefinder-org.onrender.com/health | python -m json.tool
echo ""
echo ""

echo "3. Testing with sample data (POST /analyze-part)..."
curl -X POST https://aiagent-sparefinder-org.onrender.com/analyze-part \
  -F "user_email=test@example.com" \
  -F "keywords=Toyota Camry brake pad front right" \
  -s | python -m json.tool
echo ""
echo ""

echo "All tests completed!"

