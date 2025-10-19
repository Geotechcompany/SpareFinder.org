#!/usr/bin/env python3
"""
Deploy the AI service with job data included
This creates a deployment package that includes the job files
"""

import os
import shutil
import zipfile
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def create_deployment_package():
    """Create a deployment package with job data"""
    
    print("Creating deployment package with job data...")
    
    # Create deployment directory
    deploy_dir = Path("deployment")
    if deploy_dir.exists():
        shutil.rmtree(deploy_dir)
    deploy_dir.mkdir()
    
    # Copy the entire service
    print("1. Copying service files...")
    shutil.copytree("app", deploy_dir / "app")
    shutil.copytree("uploads", deploy_dir / "uploads")
    
    # Copy essential files
    essential_files = [
        "requirements.txt",
        "main.py",
        "start.py",
        "Dockerfile",
        "render.yaml",
        ".env"
    ]
    
    for file in essential_files:
        if os.path.exists(file):
            shutil.copy2(file, deploy_dir / file)
            print(f"   Copied: {file}")
    
    # Create a simple start script
    start_script = deploy_dir / "start.py"
    with open(start_script, 'w') as f:
        f.write('''#!/usr/bin/env python3
"""
Start script for deployment
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.main import app
import uvicorn

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
''')
    
    print("2. Created start script")
    
    # Create zip file
    zip_path = "sparefinder-ai-with-data.zip"
    print(f"3. Creating zip file: {zip_path}")
    
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(deploy_dir):
            for file in files:
                file_path = Path(root) / file
                arc_path = file_path.relative_to(deploy_dir)
                zipf.write(file_path, arc_path)
    
    print(f"SUCCESS: Created deployment package: {zip_path}")
    
    # Show package contents
    print("\nPackage contents:")
    with zipfile.ZipFile(zip_path, 'r') as zipf:
        for name in sorted(zipf.namelist()):
            print(f"  {name}")
    
    return zip_path

def check_job_data():
    """Check if job data exists"""
    jobs_dir = Path("uploads/jobs")
    if not jobs_dir.exists():
        print("ERROR: No job data found")
        return False
    
    json_files = list(jobs_dir.glob("*.json"))
    print(f"Found {len(json_files)} job files")
    return len(json_files) > 0

if __name__ == "__main__":
    print("SpareFinder AI Deployment with Data")
    print("=" * 40)
    
    # Check if job data exists
    if not check_job_data():
        print("ERROR: No job data found. Run some analyses first.")
        exit(1)
    
    # Create deployment package
    zip_path = create_deployment_package()
    
    print(f"\nDeployment package ready: {zip_path}")
    print("\nTo deploy:")
    print("1. Upload this zip file to your hosting service")
    print("2. Extract it in your deployment directory")
    print("3. Install dependencies: pip install -r requirements.txt")
    print("4. Run: python start.py")
