import os
import re
from setuptools import setup, find_packages

# Simple version retrieval
VERSION = "1.0.1"

setup(
    name="SpareFinderAI-Service",
    version=VERSION,
    packages=find_packages(exclude=['tests*']),
    
    # Direct requirements specification
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
    
    # Metadata
    description="AI-powered automotive part identification service",
    long_description=open('README.md').read() if os.path.exists('README.md') else '',
    long_description_content_type='text/markdown',
    
    # Project details
    author="SpareFinderAI Team",
    author_email="support@sparefinderai.com",
    url="https://github.com/yourusername/SpareFinderAI-Service",
    
    # Python version compatibility
    python_requires=">=3.8,<3.13",
    
    # Classifiers for package discovery
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: Scientific/Engineering :: Artificial Intelligence"
    ],
    
    # Additional package data
    include_package_data=True,
    package_data={
        '': ['*.txt', '*.rst', '*.md', '*.json'],
    },
    
    # Entry points for CLI
    entry_points={
        'console_scripts': [
            'sparefinderai-service=app.main:main',
        ],
    },
    
    # Optional dependencies
    extras_require={
        'dev': [
            'pytest',
            'pytest-asyncio',
            'mypy',
            'black',
            'isort'
        ]
    }
) 