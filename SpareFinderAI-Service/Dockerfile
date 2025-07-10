# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV PIP_NO_CACHE_DIR 1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy the entire project
COPY . /app

# Create a virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Upgrade pip and core tools
RUN pip install --upgrade pip setuptools wheel

# Upgrade pip and resolve dependencies
RUN pip install --upgrade pip \
    && pip install --upgrade setuptools \
    && pip install wheel \
    && pip install --upgrade numpy \
    && pip install -r requirements.txt --no-deps \
    && pip install -r requirements.txt

# Create necessary directories
RUN mkdir -p /app/uploads /app/models /app/logs

# Set permissions
RUN chown -R nobody:nogroup /app

# Switch to non-root user
USER nobody

# Expose the port the app runs on
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"] 