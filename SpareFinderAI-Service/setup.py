import os
import re
from setuptools import setup, find_packages

setup(
    name="SpareFinderAI-Service",
    version="1.0.1",
    packages=find_packages(),
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
    python_requires=">=3.8,<3.13",
    description="AI-powered automotive part identification service",
    author="SpareFinderAI Team",
    author_email="support@sparefinderai.com",
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