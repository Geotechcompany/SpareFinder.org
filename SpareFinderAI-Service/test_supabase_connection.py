#!/usr/bin/env python3
"""
Test Supabase database connection
Run this after updating your DATABASE_URL in .env
"""

import os
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_connection():
    """Test database connection"""
    
    print("Testing Supabase Database Connection")
    print("=" * 40)
    
    # Check if DATABASE_URL is set
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL not found in .env file")
        return False
    
    if "YOUR_PASSWORD" in db_url:
        print("ERROR: Please update DATABASE_URL with your actual password")
        print("Current DATABASE_URL:", db_url)
        return False
    
    print(f"DATABASE_URL: {db_url[:50]}...")
    
    # Test connection
    try:
        from app.services.db_job_store import db_job_store
        
        if db_job_store.connection:
            print("SUCCESS: Database connection established!")
            
            # Test a simple query
            with db_job_store.connection.cursor() as cursor:
                cursor.execute("SELECT version();")
                version = cursor.fetchone()
                print(f"PostgreSQL version: {version[0]}")
            
            return True
        else:
            print("ERROR: Database connection failed")
            return False
            
    except Exception as e:
        print(f"ERROR: Database connection error: {e}")
        return False

if __name__ == "__main__":
    if test_connection():
        print("\n✅ Database connection successful!")
        print("You can now run the migration script.")
    else:
        print("\n❌ Database connection failed.")
        print("Please check your DATABASE_URL in .env file.")
