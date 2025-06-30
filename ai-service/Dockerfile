FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    DEBIAN_FRONTEND=noninteractive

# Set working directory
WORKDIR /app

# Install system dependencies for web scraping and image processing
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    wget \
    unzip \
    gnupg \
    ca-certificates \
    apt-transport-https \
    software-properties-common \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgcc-s1 \
    libfontconfig1 \
    libfreetype6 \
    libxss1 \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
    fonts-liberation \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# Install Chrome and ChromeDriver with version matching and fallback
RUN apt-get update && apt-get install -y \
    wget \
    unzip \
    xvfb \
    curl \
    && wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && CHROME_VERSION=$(google-chrome --version | cut -d " " -f3 | cut -d "." -f1-3) \
    && echo "Chrome version: $CHROME_VERSION" \
    && (CHROMEDRIVER_VERSION=$(curl -s "https://googlechromelabs.github.io/chrome-for-testing/LATEST_RELEASE_$CHROME_VERSION") \
    && echo "ChromeDriver version: $CHROMEDRIVER_VERSION" \
    && wget -O /tmp/chromedriver.zip "https://edgedl.me.gvt1.com/edgedl/chrome/chrome-for-testing/$CHROMEDRIVER_VERSION/linux64/chromedriver-linux64.zip" \
    || (echo "Chrome for Testing API failed, using stable version" \
    && CHROMEDRIVER_VERSION=$(curl -s "https://chromedriver.storage.googleapis.com/LATEST_RELEASE") \
    && echo "Fallback ChromeDriver version: $CHROMEDRIVER_VERSION" \
    && wget -O /tmp/chromedriver.zip "https://chromedriver.storage.googleapis.com/$CHROMEDRIVER_VERSION/chromedriver_linux64.zip")) \
    && unzip /tmp/chromedriver.zip -d /tmp/ \
    && (mv /tmp/chromedriver-linux64/chromedriver /usr/local/bin/ || mv /tmp/chromedriver /usr/local/bin/) \
    && chmod +x /usr/local/bin/chromedriver \
    && rm -rf /tmp/chromedriver* \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && chromedriver --version \
    && google-chrome --version

# Create non-root user
RUN useradd -m -u 1000 appuser && \
    mkdir -p /app/models /app/logs /app/cache && \
    chown -R appuser:appuser /app

# Copy requirements first (for better caching)
COPY ai-service/requirements.txt ./

# Install Python dependencies with proper order for NumPy compatibility
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir "numpy>=1.21.0,<2.0.0" && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY --chown=appuser:appuser ai-service/ ./

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Default port (can be overridden)
ENV PORT=8000
EXPOSE ${PORT}

# Set resource limits and environment for GPT-4 Vision + Web Scraping
ENV WORKERS=2 \
    MAX_REQUESTS=1000 \
    MAX_REQUESTS_JITTER=50 \
    TIMEOUT=300 \
    WEB_SCRAPING_ENABLED=true \
    MAX_SCRAPING_SITES=5 \
    SCRAPING_DELAY=2.0

# Chrome options for Selenium
ENV CHROME_OPTIONS="--headless --no-sandbox --disable-dev-shm-usage --disable-gpu"

# Run the application with Gunicorn
CMD gunicorn \
    --bind 0.0.0.0:${PORT} \
    --workers ${WORKERS} \
    --timeout ${TIMEOUT} \
    --max-requests ${MAX_REQUESTS} \
    --max-requests-jitter ${MAX_REQUESTS_JITTER} \
    --worker-class uvicorn.workers.UvicornWorker \
    --worker-tmp-dir /dev/shm \
    --log-file - \
    app.main:app 