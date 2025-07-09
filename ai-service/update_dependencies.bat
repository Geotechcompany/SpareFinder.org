@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

if not exist venv (
    python -m venv venv
)

call venv\Scripts\activate

pip install --upgrade pip setuptools wheel

pip install -r requirements.txt

pip list

deactivate

echo Dependencies updated successfully!
pause 