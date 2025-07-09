from setuptools import setup, find_packages
import os
import sys

def get_version():
    # Multiple fallback methods for version extraction
    version_paths = [
        os.path.join(os.path.dirname(__file__), 'VERSION'),
        os.path.join(os.path.dirname(__file__), 'version.txt'),
        os.path.join(os.path.dirname(__file__), 'pyproject.toml')
    ]
    
    # Print debugging information
    print(f"Python Path: {sys.path}", file=sys.stderr)
    print(f"Current Directory: {os.getcwd()}", file=sys.stderr)
    print(f"Script Directory: {os.path.dirname(__file__)}", file=sys.stderr)
    
    for path in version_paths:
        try:
            print(f"Attempting to read version from: {path}", file=sys.stderr)
            if os.path.exists(path):
                with open(path, 'r') as f:
                    content = f.read().strip()
                    print(f"Found version: {content}", file=sys.stderr)
                    return content
        except Exception as e:
            print(f"Error reading {path}: {e}", file=sys.stderr)
    
    # Absolute last resort
    print("Falling back to default version", file=sys.stderr)
    return "1.0.1"

# Explicitly set version to avoid KeyError
__version__ = get_version()

setup(
    name="SpareFinderAI-Service",
    version=__version__,
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