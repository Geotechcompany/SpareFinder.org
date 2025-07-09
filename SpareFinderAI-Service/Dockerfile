# Use an official Python runtime as a parent image
FROM python:3.12-slim-bullseye

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV PORT 8000

# Set working directory in the container
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    software-properties-common \
    git \
    libpq-dev \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy the current directory contents into the container at /app
COPY . /app

# Create a virtual environment
RUN python -m venv venv

# Activate virtual environment and install dependencies
RUN . venv/bin/activate && \
    pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

# Expose the port the app runs on
EXPOSE 8000

# Create a directory for uploads
RUN mkdir -p /app/uploads

# Set permissions for uploads directory
RUN chmod 777 /app/uploads

# Health check
HEALTHCHECK CMD curl --fail http://localhost:8000/health || exit 1

# Run the application using gunicorn
CMD ["/bin/bash", "-c", ". venv/bin/activate && python -m gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:${PORT}"] 