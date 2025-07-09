# Part Analysis Results Table Setup

## Overview
The `part_analysis_results` table is designed to store AI-powered automotive part identification analyses. It captures detailed information about image analysis, including predictions, performance metrics, and user context.

## Table Schema

### Columns
- `id`: Unique UUID for each analysis result
- `user_id`: References the user who performed the analysis
- `image_url`: Public URL of the uploaded image in Supabase storage
- `predictions`: JSONB column storing AI prediction details
- `similar_images`: JSONB column for related image information
- `processing_time`: Time taken for analysis
- `confidence_threshold`: Minimum confidence used for predictions
- `created_at`: Timestamp of analysis creation
- `updated_at`: Timestamp of last update
- `primary_part_name`: Name of the primary detected part
- `primary_part_category`: Category of the primary detected part
- `primary_part_confidence`: Confidence score of the primary part
- `metadata`: Additional contextual information

## Features
- Automatic UUID generation
- Timestamps with auto-update trigger
- Row Level Security (RLS)
- Indexes for performance
- Flexible JSONB storage for predictions and metadata

## Security Policies
- Users can only view and insert their own analysis results
- Linked to Supabase authentication system

## Recommended Usage
1. Ensure Supabase authentication is set up
2. Run the SQL script in Supabase SQL Editor
3. Configure your AI service to use this table for storing analysis results

## Example Query
```sql
-- Retrieve a user's part analysis results
SELECT 
    id, 
    image_url, 
    primary_part_name, 
    primary_part_category, 
    created_at
FROM part_analysis_results
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 10;
```

## Notes
- Requires `uuid-ossp` extension
- Assumes Supabase authentication is configured
- Modify policies as needed for your specific use case 