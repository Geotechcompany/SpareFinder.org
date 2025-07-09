import os
import re
from setuptools import setup, find_packages

def get_version():
    """
    Retrieve the package version from a version file or use a default
    """
    try:
        # Try to read version from a version file
        version_file = os.path.join(os.path.dirname(__file__), 'VERSION')
        if os.path.exists(version_file):
            with open(version_file, 'r') as f:
                return f.read().strip()
        
        # Fallback to a default version
        return "1.0.0"
    except Exception:
        return "1.0.0"

def read_requirements():
    """
    Read requirements from requirements.txt
    """
    try:
        with open('requirements.txt', 'r') as f:
            return [line.strip() for line in f 
                    if line.strip() and not line.startswith('#')]
    except FileNotFoundError:
        # Fallback requirements if file not found
        return [
            "fastapi==0.110.1",
            "uvicorn==0.28.0",
            "python-multipart==0.0.9",
            "httpx==0.27.0",
            "pydantic==2.6.4",
            "python-dotenv==1.0.1",
            "openai==1.14.3",
            "pillow==10.2.0"
        ]

# Retrieve version
__version__ = get_version()

setup(
    name="SpareFinderAI-Service",
    version=__version__,
    packages=find_packages(exclude=['tests*']),
    
    # Dynamic requirements loading
    install_requires=read_requirements(),
    
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