from setuptools import setup, find_packages
import os
import sys

def read_version():
    """
    Read version from multiple possible sources with extensive error handling
    """
    version_sources = [
        os.environ.get('PACKAGE_VERSION'),  # Environment variable
        os.path.join(os.path.dirname(__file__), 'VERSION'),
        os.path.join(os.path.dirname(__file__), 'version.txt'),
    ]
    
    for source in version_sources:
        try:
            if source and os.path.isfile(source):
                with open(source, 'r') as f:
                    version = f.read().strip()
                    if version:
                        print(f"Version found in {source}: {version}", file=sys.stderr)
                        return version
            elif source:
                print(f"Using version from environment or direct source: {source}", file=sys.stderr)
                return str(source)
        except Exception as e:
            print(f"Error reading version from {source}: {e}", file=sys.stderr)
    
    # Absolute fallback
    fallback_version = "1.0.1"
    print(f"WARNING: No version found. Using fallback: {fallback_version}", file=sys.stderr)
    return fallback_version

# Determine version
VERSION = read_version()

setup(
    name="SpareFinderAI-Service",
    version=VERSION,
    packages=find_packages(exclude=['tests*']),
    
    # Explicit requirements
    install_requires=[
        "fastapi==0.110.1",
        "uvicorn==0.28.0",
        "python-multipart==0.0.9",
        "httpx==0.27.0",
        "pydantic==2.6.4",
        "python-dotenv==1.0.1",
        "openai==1.14.3",
        "pillow==10.2.0"
    ],
    
    # Python version compatibility
    python_requires=">=3.8,<3.13",
    
    # Metadata
    description="AI-powered automotive part identification service",
    author="SpareFinderAI Team",
    author_email="support@sparefinderai.com",
    
    # Classifiers
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12"
    ]
) 