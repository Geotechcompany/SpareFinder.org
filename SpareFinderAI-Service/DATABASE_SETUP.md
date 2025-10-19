# Database Storage Setup Guide

This guide shows how to migrate from file-based job storage to database storage.

## Benefits of Database Storage

- ✅ **Solves synchronization** between local and live servers
- ✅ **Better data integrity** and consistency
- ✅ **Improved querying** and filtering capabilities
- ✅ **Better scalability** than file-based storage
- ✅ **Automatic backups** and data persistence

## Setup Steps

### 1. Database Requirements

You'll need a PostgreSQL database. Options:

- **Supabase** (recommended - you already have this)
- **Render PostgreSQL**
- **AWS RDS**
- **Local PostgreSQL**

### 2. Environment Variables

Add these to your `.env` file:

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database_name

# OR individual variables:
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=sparefinder
DB_USER=your-username
DB_PASSWORD=your-password
```

### 3. Install Dependencies

```bash
pip install psycopg2-binary
```

### 4. Setup Database Schema

```bash
python migrate_to_database.py
```

This will:

- Create the database schema
- Migrate all existing job files to the database
- Test the migration

### 5. Update Your Code

Replace file-based storage with database storage:

#### In `app/main.py`:

```python
# Add this import
from app.services.db_job_store import db_job_store

# Replace the /jobs endpoint
@app.get("/jobs")
async def list_jobs():
    try:
        jobs = db_job_store.list_jobs(limit=1000)
        return JSONResponse(status_code=200, content={"success": True, "results": jobs})
    except Exception as e:
        logger.error(f"/jobs error: {e}")
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

# Replace job saving calls
# OLD: save_job_snapshot(job_id, result)
# NEW: db_job_store.save_job(job_id, result)
```

### 6. Deploy

Deploy your updated service with database storage.

## Database Schema

The `jobs` table includes:

- `id` - Primary key (job ID)
- `filename` - Original filename
- `success` - Analysis success status
- `status` - Job status (pending, completed, failed)
- `class_name` - Detected part class
- `category` - Part category
- `precise_part_name` - Identified part name
- `manufacturer` - Part manufacturer
- `confidence_score` - AI confidence score
- `description` - Part description
- `technical_data_sheet` - Technical specifications (JSONB)
- `suppliers` - Supplier information (JSONB)
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

## New API Endpoints

- `GET /jobs` - List all jobs
- `GET /jobs/stats` - Get job statistics
- `GET /jobs/{job_id}` - Get specific job
- `DELETE /jobs/{job_id}` - Delete job

## Migration Benefits

After migration:

- ✅ **Live server will show all jobs** (no more empty results)
- ✅ **Data stays synchronized** between environments
- ✅ **Better performance** for large datasets
- ✅ **Easier backup and recovery**
- ✅ **Better data integrity**

## Troubleshooting

### Database Connection Issues

- Check your `DATABASE_URL` or individual DB\_\* variables
- Ensure the database is accessible from your server
- Verify credentials are correct

### Migration Issues

- Check that all job files are valid JSON
- Ensure database schema was created successfully
- Check database permissions

### Performance Issues

- Add indexes for frequently queried fields
- Consider pagination for large datasets
- Monitor database performance

## Rollback Plan

If you need to rollback to file storage:

1. Keep your original `uploads/jobs/` directory
2. The file-based code is still available in `job_store.py`
3. Simply revert the changes to use file storage again
