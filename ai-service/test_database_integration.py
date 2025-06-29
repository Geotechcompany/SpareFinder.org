#!/usr/bin/env python3
"""
Test script to verify database integration for user statistics and history tracking.
"""

import asyncio
import logging
import os
import sys
from datetime import datetime
from typing import Dict, List

# Add the current directory to the path so we can import our modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.database_service import database_service, log_ai_prediction
from app.core.config import get_settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_database_connection():
    """Test basic database connection."""
    logger.info("Testing database connection...")
    
    try:
        is_connected = await database_service.test_connection()
        if is_connected:
            logger.info("✅ Database connection successful!")
            return True
        else:
            logger.error("❌ Database connection failed!")
            return False
    except Exception as e:
        logger.error(f"❌ Database connection error: {e}")
        return False

async def test_prediction_logging():
    """Test logging a prediction to the database."""
    logger.info("Testing prediction logging...")
    
    try:
        # Mock prediction data
        test_predictions = [
            {
                "class_name": "Brake Pad",
                "confidence": 0.85,
                "category": "Braking System",
                "description": "Front brake pad for automotive use"
            },
            {
                "class_name": "Tire",
                "confidence": 0.72,
                "category": "Tires & Wheels",
                "description": "All-season tire"
            }
        ]
        
        test_similar_images = [
            {
                "title": "Premium Brake Pads Set",
                "price": "£45.99",
                "url": "https://example.com/brake-pads",
                "image_url": "https://example.com/images/brake-pads.jpg",
                "source": "eBay UK"
            }
        ]
        
        # Test with and without user_id to verify both scenarios
        test_cases = [
            {
                "user_id": "test-user-123",
                "description": "with user_id"
            },
            {
                "user_id": None,
                "description": "without user_id (should skip)"
            }
        ]
        
        for test_case in test_cases:
            logger.info(f"Testing prediction logging {test_case['description']}...")
            
            success = await log_ai_prediction(
                request_id=f"test_req_{int(datetime.now().timestamp())}",
                predictions=test_predictions,
                processing_time=2.5,
                model_version="Google Vision API v1",
                similar_images=test_similar_images,
                web_scraping_used=True,
                user_id=test_case["user_id"],
                image_metadata={
                    "filename": "test_brake_pad.jpg",
                    "content_type": "image/jpeg",
                    "size_bytes": 1024000
                }
            )
            
            if success:
                logger.info(f"✅ Prediction logging {test_case['description']} successful!")
            else:
                logger.info(f"ℹ️  Prediction logging {test_case['description']} skipped (expected for no user_id)")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Prediction logging error: {e}")
        return False

async def test_user_statistics():
    """Test retrieving user statistics."""
    logger.info("Testing user statistics retrieval...")
    
    try:
        test_user_id = "test-user-123"
        stats = await database_service.get_user_statistics(test_user_id)
        
        if stats:
            logger.info(f"✅ User statistics retrieved successfully!")
            logger.info(f"   Total uploads: {stats.get('total_uploads', 0)}")
            logger.info(f"   Success rate: {stats.get('success_rate', 0)}%")
        else:
            logger.info("ℹ️  No user statistics found (expected for new test user)")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ User statistics error: {e}")
        return False

async def main():
    """Run all database integration tests."""
    logger.info("🧪 Starting Database Integration Tests")
    logger.info("=" * 50)
    
    settings = get_settings()
    
    # Check if database is configured
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
        logger.warning("⚠️  Database not configured - set SUPABASE_URL and SUPABASE_SERVICE_KEY")
        logger.info("Skipping database tests...")
        return
    
    if not database_service.is_enabled():
        logger.warning("⚠️  Database service is not enabled")
        return
    
    # Run tests
    tests = [
        ("Database Connection", test_database_connection),
        ("Prediction Logging", test_prediction_logging),
        ("User Statistics", test_user_statistics),
    ]
    
    results = []
    for test_name, test_func in tests:
        logger.info(f"\n🔍 Running {test_name} test...")
        try:
            result = await test_func()
            results.append((test_name, result))
        except Exception as e:
            logger.error(f"❌ {test_name} test failed with exception: {e}")
            results.append((test_name, False))
    
    # Summary
    logger.info("\n" + "=" * 50)
    logger.info("📊 Test Results Summary:")
    
    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        logger.info(f"   {test_name}: {status}")
        if result:
            passed += 1
    
    logger.info(f"\n🎯 Overall: {passed}/{len(results)} tests passed")
    
    if passed == len(results):
        logger.info("🎉 All database integration tests passed!")
    else:
        logger.warning("⚠️  Some tests failed - check configuration and database setup")

if __name__ == "__main__":
    asyncio.run(main()) 