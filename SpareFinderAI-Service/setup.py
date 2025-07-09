from setuptools import setup, find_packages

setup(
    name="SpareFinderAI-Service",
    version="1.0.0",
    packages=find_packages(),
    install_requires=[
        "fastapi==0.109.0",
        "uvicorn==0.24.0",
        "python-multipart==0.0.9",
        "httpx==0.26.0",
        "pydantic==2.6.1",
        "python-dotenv==1.0.0",
        "openai==1.12.0",
        "pillow==9.5.0"
    ],
    python_requires=">=3.8",
    description="AI-powered automotive part identification service",
    author="SpareFinderAI Team",
    classifiers=[
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ]
) 