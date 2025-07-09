@echo off
setlocal enabledelayedexpansion

:: Color codes
set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "RESET=[0m"

:: Function to print status messages
:print_status
echo %YELLOW%%~1%RESET%
exit /b

:: Function to print success messages
:print_success
echo %GREEN%%~1%RESET%
exit /b

:: Function to print error messages
:print_error
echo %RED%%~1%RESET%
exit /b

:: Check if Node.js is installed
call :print_status "Checking Node.js installation..."
where node >nul 2>nul
if %errorlevel% neq 0 (
    call :print_error "Node.js is not installed. Please install Node.js v16 or higher."
    exit /b 1
)

:: Check Node.js version
for /f "delims=" %%a in ('node --version') do set "NODE_VERSION=%%a"
call :print_status "Node.js version: %NODE_VERSION%"

:: Check if npm is installed
call :print_status "Checking npm installation..."
where npm >nul 2>nul
if %errorlevel% neq 0 (
    call :print_error "npm is not installed. Please install npm."
    exit /b 1
)

:: Create .env file if it doesn't exist
if not exist .env (
    call :print_status "Creating .env file..."
    (
        echo # Supabase Configuration
        echo SUPABASE_URL=https://your-project.supabase.co
        echo SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
        echo SUPABASE_DATABASE_URL=postgresql://postgres:password@your-host:5432/postgres
    ) > .env
    call :print_success ".env file created. Please update it with your Supabase credentials."
)

:: Install dependencies
call :print_status "Installing project dependencies..."
call npm install

:: Install Supabase CLI globally (optional)
call :print_status "Installing Supabase CLI globally..."
call npm install -g supabase-cli

:: Create migrations directory if it doesn't exist
if not exist migrations mkdir migrations

:: Print completion message
call :print_success "🎉 SpareFinderAI Database Migration Setup Complete!"
call :print_status "Next steps:"
call :print_status "1. Update .env with your Supabase credentials"
call :print_status "2. Run 'npm run migrate' to apply migrations"

exit /b 0 