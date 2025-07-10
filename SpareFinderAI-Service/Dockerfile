# Use an official Python runtime as a parent image
FROM python:3.12-slim

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
    && rm -rf /var/lib/apt/lists/*

# Copy the entire project
COPY . /app

# Create a virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Upgrade pip and core tools
RUN pip install --upgrade pip setuptools wheel

# Copy the dependency installation script
COPY install_dependencies.py /app/install_dependencies.py

# Make the script executable
RUN chmod +x /app/install_dependencies.py

# Install dependencies using the custom script
RUN python /app/install_dependencies.py

# Additional project-specific setup
RUN mkdir -p /app/uploads

# Make port 8000 available to the world outside this container
EXPOSE 8000

# Health check
HEALTHCHECK CMD curl -f http://localhost:8000/health || exit 1

# Set permissions for startup scripts
RUN chmod +x start.py start_service.py

# Run the application
CMD ["python", "start.py"] 