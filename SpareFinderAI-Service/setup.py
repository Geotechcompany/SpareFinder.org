from setuptools import setup, find_packages
import os

# Robust version extraction
def get_version():
    version_file = os.path.join(os.path.dirname(__file__), 'VERSION')
    try:
        with open(version_file, 'r') as f:
            return f.read().strip()
    except FileNotFoundError:
        return "1.0.1"  # Fallback version

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